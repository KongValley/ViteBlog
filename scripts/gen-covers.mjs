// 用图像生成模型给文章做**像素风封面**(风格与站点默认像素风一致,但每篇的图案按主题生成)。
//
//   DASHSCOPE_BASE_URL=https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1 \
//   DASHSCOPE_API_KEY=sk-... npm run cover:ai -- <slug>          # 单篇打样
//   DASHSCOPE_API_KEY=sk-... npm run cover:ai -- --all           # 全站批量(每篇一次请求,注意计费)
//   npm run cover:ai -- --all --dry-run                          # 不需要 key:只打印将要发出的请求体
//
// 走阿里云百炼(模型 studio)的「千问-图像生成与编辑 3.0」OpenAI 兼容接口。
//
// ⚠ 必须把 DASHSCOPE_BASE_URL 设成**业务空间专属域名**,不能用老的 dashscope.aliyuncs.com:
//   实测老域名上的 /compatible-mode/v1/images/generations 直接 404(那条路由只在专属域名上有),
//   专属域名格式(华北2 北京;新加坡把 cn-beijing 换成 ap-southeast-1):
//     https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1
//   {WorkspaceId} 在百炼控制台「业务空间详情」里能看到。
//
// 可选参数:
//   --model qwen-image-3.0-pro|qwen-image-3.0   默认 pro(质量优先),标准版更快更省
//   --size  1600x840                            默认按封面比例(1200×630)留一点裁切余量;也可 auto
//   --index N                                   换一张:同一篇用不同 seed 重打
//   --style "额外的风格补充"                      追加到提示词尾部
//   --extend                                    开启提示词的智能改写(默认关闭,免得把风格要求改跑)
//
// 生成结果下载后裁成 1200×630,存到 public/images/covers/<slug>.jpg 并回填 frontmatter 的 cover。
// 之所以落在 public/images/:构建期的 webp 变体管线只认清单里的本地图,而且分享长图是同源取图
// (远程图会被跨域标脏、导不出来)。

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const POSTS_DIR = join(ROOT, 'src', 'posts');
const COVER_DIR = join(ROOT, 'public', 'images', 'covers');
const WIDTH = 1200;
const HEIGHT = 630;
const CONCURRENCY = 2;

// 支持把 key 放进 .env.local(已被 .gitignore 的 *.local 覆盖),免得写进 shell 历史
for (const envFile of ['.env.local', '.env']) {
  const path = join(ROOT, envFile);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  }
}

const apiKey = process.env.DASHSCOPE_API_KEY ?? '';
const baseUrl = (process.env.DASHSCOPE_BASE_URL ?? '').replace(/\/$/, '');

/** 老域名上没有图像接口(实测 404),这里统一给一句能照着做的提示 */
const BASE_HINT = [
  '把 DASHSCOPE_BASE_URL 设成业务空间专属域名(WorkspaceId 在百炼控制台「业务空间详情」里看):',
  '  https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1      # 华北2 北京',
  '  https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1 # 新加坡',
  '注意 dashscope.aliyuncs.com 这类老域名上没有 /compatible-mode/v1/images/generations(实测 404)。',
].join('\n');

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const positional = [];
for (const value of ['--model', '--size', '--style', '--index']) {
  const at = args.indexOf(value);
  if (at >= 0) args.splice(at, 2);
}
for (const arg of args)
  if (!arg.startsWith('--') && arg !== 'all') positional.push(arg);
const [slug] = positional;
const all = flag('all');
const dryRun = flag('dry-run');

const model = option('model', 'qwen-image-3.0-pro');
const size = option('size', '1600x840');
const style = option('style', '');
const index = Number(option('index', '0')) || 0;
const extend = flag('extend');

if (!slug && !all) {
  console.error(
    '用法:DASHSCOPE_API_KEY=sk-... node scripts/gen-covers.mjs <slug>|--all [--dry-run] [--model …] [--size …] [--index N]',
  );
  process.exit(1);
}
if (!apiKey && !dryRun) {
  console.error(
    '缺少 DASHSCOPE_API_KEY(阿里云百炼控制台「API-KEY 管理」里创建)。\n' +
      '  只想看请求体可以用 --dry-run,不需要 key。',
  );
  process.exit(1);
}
if (!baseUrl && !dryRun) {
  console.error(`缺少 DASHSCOPE_BASE_URL。\n${BASE_HINT}`);
  process.exit(1);
}

// frontmatter 的 cover 会原样进 <img src>,必须自带部署 base(正文图片则由 renderMarkdown 补)
const BASE = (() => {
  const matched = readFileSync(join(ROOT, 'vite.config.ts'), 'utf8').match(
    /\bbase:\s*'([^']*)'/,
  );
  const value = matched?.[1] ?? '/';
  return value.endsWith('/') ? value : `${value}/`;
})();

/** 中文标签 → 英文主题词:提示词里中英都给,模型两边都吃 */
const TOPIC_MAP = {
  工具: 'developer tooling',
  入门: 'learning programming',
  基础: 'programming fundamentals',
  进阶: 'advanced software engineering',
  股市: 'stock market',
  股票: 'stock market',
  记录: 'keeping notes',
  生活: 'everyday life',
  数据库: 'database',
  部署: 'deployment servers',
  性能: 'performance',
  闭包: 'functions and scopes',
  类型: 'type systems',
  图标: 'icon design',
  'AI 编程': 'AI coding assistant',
  'Build Blog': 'blog building',
  技术指标: 'technical analysis charts',
  股市基础技能: 'stock market charts',
  数据可视化: 'data visualization',
  网络: 'computer network',
  安全: 'cyber security',
  测试: 'software testing',
  重构: 'code refactoring',
  算法: 'algorithms',
};

function listPosts() {
  const entries = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.md')) entries.push(full);
    }
  };
  walk(POSTS_DIR);
  return entries.sort();
}

const slugOf = (file) =>
  relative(POSTS_DIR, file).replace(/\\/g, '/').replace(/\.md$/, '');

/** 极简 frontmatter 读取(只取 title / tags / categories,不引运行时代码) */
function readMeta(file) {
  const raw = readFileSync(file, 'utf8');
  const block = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const meta = { title: '', tags: [], categories: [] };
  if (!block) return meta;
  let listKey = '';
  for (const line of block[1].split(/\r?\n/)) {
    const listItem = line.match(/^\s+-\s+(.+)$/);
    if (listItem && listKey) {
      meta[listKey].push(listItem[1].trim());
      continue;
    }
    const kv = line.match(/^([a-zA-Z]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, value] = kv;
    if (key === 'title') meta.title = value.trim();
    if (key === 'tags' || key === 'categories') {
      listKey = key;
      if (value.trim())
        meta[key] = value
          .split(/[,，]/)
          .map((v) => v.trim())
          .filter(Boolean);
    }
  }
  return meta;
}

/** 文章 → 主题短语(英文词 + 中文原标题,便于中文模型理解) */
function topicOf(postSlug, meta) {
  const words = postSlug
    .split('/')
    .pop()
    .split('-')
    .map((word) => word.toLowerCase())
    .filter(
      (word) =>
        /^[a-z]{3,}$/.test(word) &&
        !['the', 'and', 'for', 'with', 'from', 'guide', 'notes'].includes(word),
    );

  const mapped = [...(meta.tags ?? []), ...(meta.categories ?? [])]
    .map((tag) => TOPIC_MAP[tag] ?? (/^[\x20-\x7e]+$/.test(tag) ? tag : ''))
    .filter(Boolean);

  return [...new Set([...mapped, ...words].map((v) => v.toLowerCase()))]
    .slice(0, 5)
    .join(', ');
}

/** 固定的像素风模板 + 该文主题;明确禁止文字,模型很爱往图上写字 */
function buildPrompt(postSlug, meta) {
  const topic = topicOf(postSlug, meta) || 'programming';
  const title =
    meta.title && /[\u4e00-\u9fff]/.test(meta.title)
      ? `文章主题:${meta.title}。`
      : '';
  return [
    'Retro pixel art cover illustration for a tech blog article, 8-bit / 16-bit game style.',
    'Chunky visible pixels, hard edges, no anti-aliasing, limited retro palette:',
    'deep navy background (#0f0e17), NES red (#e43d44), warm gold (#f8b800), cyan accents (#22d3ee).',
    'Simple bold centered composition with generous negative space, one clear focal subject,',
    'subtle dark texture blocks in the background, generous margins so nothing touches the edges.',
    `Article topic: ${topic}.`,
    title,
    style,
  ]
    .filter(Boolean)
    .join(' ');
}

const NEGATIVE = [
  '文字, 字母, 汉字, 数字, 水印, 签名, logo, 截图, 界面',
  'text, letters, words, numbers, watermark, signature, logo, UI screenshot,',
  'blurry, low quality, jpeg artifacts, photo, 3d render, gradient mesh, anti-aliased edges',
].join(', ');

/** 调一次百炼的 OpenAI 兼容接口,返回图片二进制 */
async function generate(prompt, seed) {
  const body = {
    model,
    prompt,
    negative_prompt: NEGATIVE,
    size,
    n: 1,
    seed, // 固定 seed,--index 就是换 seed 重打
    prompt_extend: extend, // 默认关:提示词已经写得很具体,免得被改写着跑
    watermark: false,
  };

  const response = await fetch(`${baseUrl}/images/generations`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = (await response.text()).slice(0, 300);
    const hint =
      response.status === 404 || text.includes('Workspace endpoint is invalid')
        ? `\n${BASE_HINT}`
        : '';
    throw new Error(`接口返回 HTTP ${response.status}:${text}${hint}`);
  }
  const payload = await response.json();
  const url = payload.data?.[0]?.url;
  if (!url) {
    throw new Error(
      `接口没有返回图片地址:${JSON.stringify(payload).slice(0, 200)}`,
    );
  }
  // 百炼这边只给 URL(有效期 24 小时),必须马上下载
  const image = await fetch(url);
  if (!image.ok) throw new Error(`下载生成结果失败:HTTP ${image.status}`);
  return Buffer.from(await image.arrayBuffer());
}

/** slug + index → 稳定的 seed(同一篇同一 index 结果稳定,不同 index 换一张) */
function seedOf(postSlug, offset) {
  let hash = 2166136261;
  for (const char of postSlug) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs((hash + offset * 7919) % 2147483647);
}

/** 裁成 1200×630 封面 */
async function saveCover(postSlug, buffer) {
  mkdirSync(COVER_DIR, { recursive: true });
  const file = join(COVER_DIR, `${postSlug.replace(/\//g, '__')}.jpg`);
  const info = await sharp(buffer)
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(file);
  return { file, info };
}

/** 把 cover 写回 frontmatter:已有就替换,没有就插在 date 行后面 */
function writeCoverField(file, coverUrl) {
  const raw = readFileSync(file, 'utf8');
  const block = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!block) throw new Error('这篇文章没有 frontmatter');
  const lines = block[1].split(/\r?\n/);
  const coverLine = `cover: ${coverUrl}`;
  const existing = lines.findIndex((line) => line.startsWith('cover:'));
  if (existing >= 0) lines[existing] = coverLine;
  else {
    const dateAt = lines.findIndex((line) => line.startsWith('date:'));
    lines.splice(dateAt >= 0 ? dateAt + 1 : lines.length, 0, coverLine);
  }
  writeFileSync(file, raw.replace(block[1], lines.join('\n')));
}

async function mapWithLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const at = cursor;
        cursor += 1;
        results[at] = await worker(items[at]);
      }
    }),
  );
  return results;
}

async function one(file) {
  const postSlug = slugOf(file);
  const meta = readMeta(file);
  const prompt = buildPrompt(postSlug, meta);
  const seed = seedOf(postSlug, index);
  const request = {
    url: `${baseUrl}/images/generations`,
    model,
    size,
    seed,
    prompt_extend: extend,
    prompt,
  };
  if (dryRun) return { slug: postSlug, ok: true, request };

  try {
    const buffer = await generate(prompt, seed);
    const { info } = await saveCover(postSlug, buffer);
    writeCoverField(
      file,
      `${BASE}images/covers/${postSlug.replace(/\//g, '__')}.jpg`,
    );
    return { slug: postSlug, ok: true, bytes: info.size, request };
  } catch (error) {
    return { slug: postSlug, ok: false, reason: error.message, request };
  }
}

console.log(
  `模型 ${model} / 尺寸 ${size} / 接口 ${baseUrl}${dryRun ? '(dry-run)' : ''}`,
);

// ---- 单篇 ----
if (slug) {
  const file = join(POSTS_DIR, `${slug}.md`);
  if (!existsSync(file)) {
    console.error(`找不到文章:src/posts/${slug}.md`);
    process.exit(1);
  }
  const result = await one(file);
  if (dryRun) {
    console.log(
      `\n请求体(${slug}#${index}):\n${JSON.stringify(result.request, null, 2)}`,
    );
    process.exit(0);
  }
  if (!result.ok) {
    console.error(`生成失败:${result.reason}`);
    process.exit(1);
  }
  console.log(
    `\n封面已写入:public/images/covers/${slug.replace(/\//g, '__')}.jpg(${(result.bytes / 1024).toFixed(0)} KB)`,
  );
  process.exit(0);
}

// ---- 批量 ----
const files = listPosts();
console.log(`批量:${files.length} 篇(并发 ${CONCURRENCY})\n`);
const results = await mapWithLimit(files, CONCURRENCY, one);

const ok = results.filter((r) => r.ok);
const failed = results.filter((r) => !r.ok);
if (dryRun) {
  for (const item of ok) {
    console.log(`  ${item.slug}\n    ${item.request.prompt.slice(0, 130)}…\n`);
  }
}
for (const item of failed) console.log(`  ✗ ${item.slug}:${item.reason}`);

const total = ok.reduce((sum, item) => sum + (item.bytes ?? 0), 0);
console.log(
  `\n完成:成功 ${ok.length} 篇,失败 ${failed.length} 篇` +
    (dryRun
      ? '(dry-run,未调用接口)'
      : `,封面合计 ${(total / 1024 / 1024).toFixed(1)} MB`),
);
if (!dryRun) {
  console.log(
    '不满意的单篇可以重打:<slug> --index 1 换 seed,或 --style "夜间城市电路板" 加要求',
  );
}
if (failed.length > 0) process.exitCode = 1;
