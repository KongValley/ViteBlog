// 用图像生成模型给文章做**像素风封面**(和站点默认的像素风一致,但每篇的图案按主题生成)。
//
//   OPENAI_API_KEY=sk-... node scripts/gen-covers.mjs --all          # 全站批量
//   OPENAI_API_KEY=sk-... node scripts/gen-covers.mjs <slug>         # 单篇
//   OPENAI_API_KEY=sk-... node scripts/gen-covers.mjs --all --dry-run # 只打印将要发出的提示词
//
// 兼容任何 OpenAI 风格的接口:自建/中转就把 OPENAI_BASE_URL 指过去
//   OPENAI_BASE_URL=https://your-relay.example.com/v1 OPENAI_API_KEY=... node scripts/gen-covers.mjs --all
//
// 可选参数:
//   --model gpt-image-1|dall-e-3   默认 gpt-image-1
//   --size  1536x1024              默认按模型挑(gpt-image-1 → 1536x1024;dall-e-3 → 1792x1024)
//   --quality medium               默认 medium(gpt-image-1)/standard(dall-e-3)
//   --style "额外风格补充"          追加到提示词尾部
//   --index N                      同一篇多试几张(改随机种子,人工挑)
//
// 生成结果裁成 1200×630 存到 public/images/covers/<slug>.jpg 并回填 frontmatter 的 cover。
// 之所以落在 public/images/:构建期的 webp 变体管线只认清单里的本地图,而且分享长图是同源取图
// (远程图会被跨域标脏、导不出来)。
//
// 花钱提醒:gpt-image-1 按尺寸与质量计费(每张大致几美分到十几美分,以你自己的账单为准),
// --all 会给每篇文章各发一次请求。建议先 `--dry-run` 看提示词,再挑一两篇试打样。

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

const apiKey = process.env.OPENAI_API_KEY ?? '';
const baseUrl = (
  process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1'
).replace(/\/$/, '');

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const positional = [];
for (const value of ['--model', '--size', '--quality', '--style', '--index']) {
  const at = args.indexOf(value);
  if (at >= 0) args.splice(at, 2);
}
for (const arg of args)
  if (!arg.startsWith('--') && arg !== 'all') positional.push(arg);
const [slug] = positional;
const all = flag('all');
const dryRun = flag('dry-run');

const model = option('model', 'gpt-image-1');
const size = option('size', model === 'dall-e-3' ? '1792x1024' : '1536x1024');
const quality = option('quality', model === 'dall-e-3' ? 'standard' : 'medium');
const extraStyle = option('style', '');
const index = Number(option('index', '0')) || 0;

if (!slug && !all) {
  console.error(
    '用法:OPENAI_API_KEY=sk-... node scripts/gen-covers.mjs <slug>|--all [--dry-run] [--model …] [--quality …]',
  );
  process.exit(1);
}
if (!apiKey && !dryRun) {
  console.error(
    '缺少 OPENAI_API_KEY。\n' +
      '  自建/中转就同时设 OPENAI_BASE_URL(例如 https://your-relay/v1)。\n' +
      '  只想看提示词可以用 --dry-run,不需要 key。',
  );
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

/** 中文标签 → 英文主题词:提示词用英文更稳 */
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
  技术指标: 'technical analysis charts',
  股市基础技能: 'stock market charts',
  股票入门: 'stock trading basics',
  数据可视化: 'data visualization',
  网络: 'computer network',
  安全: 'cyber security',
  测试: 'software testing',
  重构: 'code refactoring',
  算法: 'algorithms',
  'AI 编程': 'AI coding assistant',
  'Build Blog': 'blog building',
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

/** 极简 frontmatter 读取:只取 title / tags / categories(不引运行时代码,免得脚本依赖 vite 虚拟模块) */
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

/** 文章 → 提示词里的主题短语(英文) */
function topicOf(postSlug, meta) {
  const words = postSlug
    .split('/')
    .pop()
    .split('-')
    .map((word) => word.toLowerCase())
    .filter(
      (word) =>
        /^[a-z]{3,}$/.test(word) &&
        !['the', 'and', 'for', 'with', 'from', 'guide'].includes(word),
    );

  const mapped = [...(meta.tags ?? []), ...(meta.categories ?? [])]
    .map((tag) => TOPIC_MAP[tag] ?? (/^[\x20-\x7e]+$/.test(tag) ? tag : ''))
    .filter(Boolean);

  return [...new Set([...mapped, ...words].map((v) => v.toLowerCase()))]
    .slice(0, 5)
    .join(', ');
}

/** 统一的像素风模板 + 该文的主题;明确禁止文字,模型很爱往图上写字 */
function buildPrompt(postSlug, meta) {
  const topic = topicOf(postSlug, meta) || 'programming';
  return [
    'Retro pixel art cover illustration for a tech blog article, 8-bit / 16-bit game style.',
    'Chunky visible pixels, hard edges, no anti-aliasing, limited retro palette:',
    'deep navy background (#0f0e17), NES red (#e43d44), warm gold (#f8b800), cyan accents (#22d3ee).',
    'Simple bold centered composition with generous negative space, one clear focal subject,',
    'subtle dark texture blocks in the background, generous margins so nothing touches the edges.',
    'NO text, no letters, no words, no numbers, no logos, no watermark, no signature, no UI screenshots.',
    `Article topic: ${topic}.`,
    extraStyle,
  ]
    .filter(Boolean)
    .join(' ');
}

/** 调一次图像接口,返回图片二进制 */
async function generate(prompt) {
  const body = { model, prompt, size, n: 1 };
  if (model === 'dall-e-3') {
    body.quality = quality;
    body.response_format = 'b64_json';
  } else {
    body.quality = quality;
  }

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
    throw new Error(`接口返回 HTTP ${response.status}:${text}`);
  }
  const payload = await response.json();
  const item = payload.data?.[0];
  if (item?.b64_json) return Buffer.from(item.b64_json, 'base64');
  if (item?.url) {
    const image = await fetch(item.url);
    if (!image.ok) throw new Error(`下载生成结果失败:HTTP ${image.status}`);
    return Buffer.from(await image.arrayBuffer());
  }
  throw new Error(`接口没有返回图片:${JSON.stringify(payload).slice(0, 200)}`);
}

/** 裁成 1200×630 封面 */
async function saveCover(postSlug, buffer) {
  mkdirSync(COVER_DIR, { recursive: true });
  const file = join(COVER_DIR, `${postSlug.replace(/\//g, '__')}.jpg`);
  const info = await sharp(buffer)
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 86, mozjpeg: true })
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
  const prompt = buildPrompt(postSlug, readMeta(file));
  if (dryRun) return { slug: postSlug, ok: true, prompt };

  try {
    const buffer = await generate(prompt);
    const { info } = await saveCover(postSlug, buffer);
    writeCoverField(
      file,
      `${BASE}images/covers/${postSlug.replace(/\//g, '__')}.jpg`,
    );
    return { slug: postSlug, ok: true, bytes: info.size, prompt };
  } catch (error) {
    return { slug: postSlug, ok: false, reason: error.message, prompt };
  }
}

console.log(`模型 ${model} / 尺寸 ${size} / 质量 ${quality} / 接口 ${baseUrl}`);

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
      `\n提示词(${slug}#${index}):\n${result.prompt}\n\n--dry-run:没有调用接口`,
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
console.log(
  `批量:${files.length} 篇(并发 ${CONCURRENCY})${dryRun ? ',dry-run' : ''}\n`,
);
const results = await mapWithLimit(files, CONCURRENCY, one);

const ok = results.filter((r) => r.ok);
const failed = results.filter((r) => !r.ok);
if (dryRun) {
  for (const item of ok)
    console.log(`  ${item.slug}\n    ${item.prompt.slice(0, 150)}…\n`);
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
    '挑到不满意的可以重打:node scripts/gen-covers.mjs <slug> --style "换成夜间城市电路板"',
  );
}
if (failed.length > 0) process.exitCode = 1;
