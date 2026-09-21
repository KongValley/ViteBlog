// 把老文章里的阿里云 OSS 外链图抓到 public/images 下,并把链接改写成站内路径
//
//   node scripts/import-images.mjs            下载 + 改写
//   node scripts/import-images.mjs --dry-run  只列计划,不下载也不改写
//
// 为什么需要它:老文章的图全挂在 OSS 外链上,public/images/ 一直是空的,
// scripts/optimize-images.mjs 那套 webp 响应式管线一次都没跑起来;图床一欠费全站挂图。
//
// 几个约定:
//   - 图片落到 public/images/<文章 slug>/<文件名>;slug 就是 src/posts 下的相对路径(去掉 .md),
//     与 vite.config.ts / src/data/posts.ts 里的 slug 一致,optimize-images.mjs 支持子目录
//   - 正文 markdown 图片改写成 /images/...(不带 base):src/data/markdown.ts 的 renderMarkdown
//     会给根路径统一补部署 base,这里再带一次会变成 /ViteBlog/ViteBlog/...
//   - frontmatter 的 cover 没有那层渲染处理(首页与文章页直接 src={cover}),
//     所以要自己带上 base,跟 vite.config.ts 里 `cover: ${base}covers/...` 是同一套写法
//   - 该 OSS 开了防盗链:裸 GET 一律 403,必须带 Referer / Origin
//   - 优先下原图(去掉 ?x-oss-process=style/xxx 的处理版),原图 404/403 才退回带参数的版本
//   - 幂等:目标文件已存在且 sha256 一致就跳过;正文里没有外链时啥也不做

import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const POSTS_DIR = join(ROOT, 'src', 'posts');
const IMAGES_DIR = join(ROOT, 'public', 'images');

const OSS_HOST = 'blog-chara-img.oss-cn-shanghai.aliyuncs.com';

// 防盗链认这两个头,少一个就是 403
const REFERER = 'https://kongvalley.github.io/';
const ORIGIN = 'https://kongvalley.github.io/';
const USER_AGENT = 'ViteBlog-image-import';

const TIMEOUT_MS = 20_000;
const ATTEMPTS = 3;

const DRY_RUN = process.argv.includes('--dry-run');

// base 从 vite.config.ts 读,免得两处各写一份(仓库改名后重跑脚本即可)
const BASE = (() => {
  const matched = readFileSync(join(ROOT, 'vite.config.ts'), 'utf8').match(
    /\bbase:\s*'([^']*)'/,
  );
  const value = matched?.[1] ?? '/';
  return value.endsWith('/') ? value : `${value}/`;
})();

// 正文图片:![alt](url "title") —— 只认 markdown 图片语法,普通链接不动
const RE_MD_IMAGE =
  /(!\[[^\]]*\]\(\s*)(https:\/\/blog-chara-img\.oss-cn-shanghai\.aliyuncs\.com\/[^\s)]+)(\s*(?:"[^"]*")?\s*\))/g;
// 少数文章直接写 HTML
const RE_HTML_IMAGE =
  /(<img\b[^>]*\bsrc=")(https:\/\/blog-chara-img\.oss-cn-shanghai\.aliyuncs\.com\/[^"]+)(")/g;
// frontmatter 封面
const RE_COVER = /^(cover:[ \t]*)(\S+)([ \t]*)$/m;
// 兜底:上面几种都认不出来的写法(只做整串替换,并在报告里点名)
// 字符集收紧到 URL 里真正会出现的那些,免得把后文的标点/中文/反引号一起吞进来
const RE_ANY = new RegExp(
  `https://${OSS_HOST.replace(/\./g, '\\.')}/[\\w\\-.~%!$&*+/:?=@#\\[\\]]+`,
  'g',
);
// 句末标点、行内代码的反引号可能还黏在尾巴上,替换前剪掉
const TRAILING_PUNCT = /[.,;:!?]+$/;

const EXT_BY_TYPE = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
const FAMILY = {
  jpg: 'jpeg',
  jpeg: 'jpeg',
  png: 'png',
  webp: 'webp',
  gif: 'gif',
};

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');
const shortHash = (text) => sha256(Buffer.from(text)).slice(0, 8);
const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

// 拆出 URL 里的文件名与分类目录(都要解码,OSS 上存的是中文名)
// ext 不带点:拼路径时统一由 layout() 补
function urlParts(url) {
  // pathname 形如 /blog-img/<分类>/<文件名>,最后两段就是要的东西
  const path = new URL(url).pathname.split('/').filter(Boolean);
  const file = decodeURIComponent(path.at(-1) ?? 'x');
  return {
    stem: file.replace(/\.[^.]+$/, ''),
    ext: extname(file).replace(/^\./, '').toLowerCase(),
    category: decodeURIComponent(path.at(-2) ?? ''),
  };
}

// 扩展名以 Content-Type 为准,但 URL 自带扩展名且属于同一家族时沿用 URL 的写法
// (下载回来的 webp 却叫 1-1.png 会让后续 sharp 处理与缓存都别扭)
function resolveExt(urlExt, contentType) {
  const fromType = EXT_BY_TYPE[contentType] ?? '';
  const sameFamily = urlExt && FAMILY[urlExt] === FAMILY[fromType];
  if (urlExt && (!fromType || sameFamily)) return urlExt;
  return fromType || urlExt || 'png';
}

// 落盘位置:public/images/<文章 slug>/<文件名>
function layout(item) {
  const name = item.ext ? `${item.stem}.${item.ext}` : item.stem;
  return {
    name,
    local: `/images/${item.slug}/${name}`,
    target: join(IMAGES_DIR, item.slug, name),
  };
}

async function fetchImage(url) {
  const response = await fetch(url, {
    headers: {
      Referer: REFERER,
      Origin: ORIGIN,
      'User-Agent': USER_AGENT,
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    response.body?.cancel?.().catch(() => {});
    const retryable = response.status >= 500 || response.status === 429;
    return { error: `HTTP ${response.status}`, retryable };
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const contentType = (response.headers.get('content-type') ?? '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  if (!bytes.length) return { error: '响应为空', retryable: true };
  if (!contentType.startsWith('image/')) {
    const type = contentType || '(缺失)';
    return { error: `Content-Type 不是图片:${type}`, retryable: false };
  }
  return { bytes, contentType };
}

// 先试原图(去掉处理参数),再退回带参数的版本;网络抖动/5xx 才重试
async function download(url) {
  const bare = url.split('?')[0];
  const candidates = bare === url ? [url] : [bare, url];
  let reason = '未知错误';
  for (const [index, candidate] of candidates.entries()) {
    for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
      try {
        const result = await fetchImage(candidate);
        if (!result.error) {
          const variant = index === 0 ? '原图' : '带 x-oss-process 的处理版';
          return { ...result, variant };
        }
        reason = result.error;
        if (!result.retryable) break; // 403/404 重试没意义,直接换候选
      } catch (error) {
        reason =
          error?.name === 'TimeoutError' || error?.name === 'AbortError'
            ? `超时(${TIMEOUT_MS / 1000}s)`
            : `请求失败:${error?.message ?? error}`;
      }
      if (attempt < ATTEMPTS) await sleep(400 * attempt);
    }
  }
  throw new Error(reason);
}

// ---------------------------------------------------------------- 1. 扫描正文

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      return entry.name.endsWith('.md') ? [full] : [];
    })
    .sort();

const articles = [];
for (const file of walk(POSTS_DIR)) {
  const text = readFileSync(file, 'utf8');
  if (!text.includes(OSS_HOST)) continue;
  const slug = relative(POSTS_DIR, file)
    .replace(/\\/g, '/')
    .replace(/\.md$/, '');
  const urls = new Set();
  for (const matched of text.matchAll(RE_MD_IMAGE)) urls.add(matched[2]);
  for (const matched of text.matchAll(RE_HTML_IMAGE)) urls.add(matched[2]);
  const cover = text.match(RE_COVER);
  if (cover?.[2].includes(OSS_HOST)) urls.add(cover[2]);
  for (const matched of text.matchAll(RE_ANY)) urls.add(matched[0]);
  articles.push({ file, slug, text, urls: [...urls] });
}

// 同一篇文章里不同 URL 的「主文件名」撞车时,拿 OSS 分类目录当前缀,保证落盘路径唯一
function assignNames(urls) {
  const items = urls.map((url) => ({ url, ...urlParts(url) }));
  const byStem = new Map();
  for (const item of items) {
    const key = item.stem.toLowerCase();
    byStem.set(key, (byStem.get(key) ?? 0) + 1);
  }
  const used = new Set();
  for (const item of items) {
    if ((byStem.get(item.stem.toLowerCase()) ?? 0) > 1) {
      item.stem = `${item.category}__${item.stem}`;
    }
    // 极端情况(同名同目录、只是查询参数不同)再加短哈希兜底
    if (used.has(item.stem.toLowerCase())) {
      item.stem = `${item.stem}-${shortHash(item.url)}`;
    }
    used.add(item.stem.toLowerCase());
  }
  return items;
}

const targets = []; // { url, slug, stem, ext, category, name, local, target }
for (const article of articles) {
  for (const item of assignNames(article.urls)) {
    const described = { ...item, slug: article.slug };
    targets.push({ ...described, ...layout(described) });
  }
}

if (!targets.length) {
  console.log('图片本地化:正文里已经没有 OSS 外链图,无需处理');
  process.exit(0);
}

// ---------------------------------------------------------------- 2. 下载落盘

let downloaded = 0;
let skipped = 0;
const failures = [];
const localized = new Map(); // `${slug}\n${url}` → 站内路径

for (const item of targets) {
  const key = `${item.slug}\n${item.url}`;

  if (DRY_RUN) {
    console.log(
      `${existsSync(item.target) ? '已有' : '待下'}  ${item.local}  ←  ${item.url}`,
    );
    localized.set(key, item.local);
    continue;
  }

  try {
    const { bytes, contentType, variant } = await download(item.url);
    // 处理版可能被 OSS 转成 webp,扩展名跟着 Content-Type 走
    item.ext = resolveExt(item.ext, contentType);
    Object.assign(item, layout(item));
    const digest = sha256(bytes);
    if (
      existsSync(item.target) &&
      sha256(readFileSync(item.target)) === digest
    ) {
      skipped += 1;
      localized.set(key, item.local);
      console.log(
        `跳过(已存在)    ${item.local}  ${formatBytes(bytes.length)}`,
      );
      continue;
    }
    mkdirSync(dirname(item.target), { recursive: true });
    writeFileSync(item.target, bytes);
    downloaded += 1;
    localized.set(key, item.local);
    console.log(
      `下载(${variant})  ${item.local}  ${formatBytes(bytes.length)}`,
    );
  } catch (error) {
    const reason = error?.message ?? String(error);
    // 之前成功过、本地文件还在:正文本来就能用,不必把整次导入判失败
    if (existsSync(item.target)) {
      skipped += 1;
      localized.set(key, item.local);
      console.log(
        `跳过(本地已有,这次没下成功)${item.local}  ←  ${item.url}(${reason})`,
      );
      continue;
    }
    failures.push({ url: item.url, reason });
    console.log(`失败           ${item.url}  ${reason}`);
  }
}

// ---------------------------------------------------------------- 3. 改写正文

let rewrites = 0;
const strayUrls = [];
const changedFiles = [];

for (const article of articles) {
  let text = article.text;
  const localOf = (url) => localized.get(`${article.slug}\n${url}`);
  // cover 得自己带 base,正文交给 renderMarkdown 补
  const withBase = (local) => `${BASE}${local.replace(/^\//, '')}`;

  text = text.replace(RE_COVER, (whole, head, url, tail) => {
    const local = localOf(url);
    if (!local) return whole;
    rewrites += 1;
    return `${head}${withBase(local)}${tail}`;
  });
  text = text.replace(RE_MD_IMAGE, (whole, head, url, tail) => {
    const local = localOf(url);
    if (!local) return whole;
    rewrites += 1;
    return `${head}${local}${tail}`;
  });
  text = text.replace(RE_HTML_IMAGE, (whole, head, url, tail) => {
    const local = localOf(url);
    if (!local) return whole;
    rewrites += 1;
    return `${head}${local}${tail}`;
  });
  // 兜底:行内代码、句末标点之类的地方也写了这个外链,一并换掉,免得验收时还有残留
  text = text.replace(RE_ANY, (whole) => {
    const url = whole.replace(TRAILING_PUNCT, '');
    const local = localOf(url);
    if (!local) return whole;
    rewrites += 1;
    const where = relative(ROOT, article.file).replace(/\\/g, '/');
    strayUrls.push(`${where}: ${url}`);
    return `${local}${whole.slice(url.length)}`;
  });

  if (text === article.text) continue;
  changedFiles.push(relative(ROOT, article.file).replace(/\\/g, '/'));
  if (!DRY_RUN) writeFileSync(article.file, text, 'utf8');
}

// ---------------------------------------------------------------- 4. 报告

const files = targets
  .map((item) => ({ path: item.local, target: item.target }))
  .filter((item) => existsSync(item.target))
  .map((item) => ({ ...item, bytes: statSync(item.target).size }))
  .sort((a, b) => b.bytes - a.bytes);
const totalBytes = files.reduce((sum, item) => sum + item.bytes, 0);

console.log('');
console.log(
  `图片本地化:下载 ${downloaded} 张,跳过 ${skipped} 张(已存在),失败 ${failures.length} 张`,
);
console.log(
  `改写链接 ${rewrites} 处,涉及 ${changedFiles.length} 篇文章${
    DRY_RUN ? '(dry-run,未落盘)' : ''
  }`,
);
if (files.length) {
  console.log(
    `总体积 ${formatBytes(totalBytes)}(共 ${files.length} 张,平均 ${formatBytes(
      Math.round(totalBytes / files.length),
    )})`,
  );
  console.log('最大的 3 张:');
  for (const item of files.slice(0, 3)) {
    console.log(`  ${formatBytes(item.bytes).padEnd(9)} ${item.path}`);
  }
}
if (strayUrls.length) {
  console.log('非 markdown 图片语法、按整串替换的位置:');
  for (const item of strayUrls) console.log(`  ${item}`);
}
if (failures.length) {
  console.log('失败清单:');
  for (const item of failures) console.log(`  ${item.url} — ${item.reason}`);
  process.exitCode = 1;
}
if (DRY_RUN) {
  console.log('(dry-run:没有下载、没有改写;去掉 --dry-run 即真正执行)');
}
