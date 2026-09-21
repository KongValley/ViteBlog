// 给文章找一张真实照片当封面。
//
//   node scripts/fetch-cover.mjs <slug> [--dry-run] [--index 2]
//   node scripts/fetch-cover.mjs --all [--dry-run]      # 批量:每篇文章各配一张,互不重复
//
// 图源用 Lorem Picsum(picsum.photos)—— 它提供 Unsplash 的免费照片,免密钥、ID 稳定,
// 而且可以直接取 1200×630 这种封面尺寸。下面的 CURATED 是人工筛过的一批 ID:
// 前十个是「笔记本 + 咖啡 + 桌面」那组工作台照片,技术博客用它们当封面很稳,其余是干净的风景静物。
// 想换某篇文章的图:node scripts/fetch-cover.mjs <slug> --index 3(多看几张再挑),
// 或者干脆自己丢一张到 public/images/covers/<slug>.jpg 并在 frontmatter 写 cover。
//
// 授权:这些照片来自 Unsplash,Unsplash License 允许免费商用、不强制署名(保留来源更稳妥)。
//
// 下载后裁成 1200×630(与自动封面、分享卡一致),落到 public/images/covers/<slug>.jpg 并写回
// frontmatter 的 cover。之所以必须落在 public/images/:构建期的 webp 变体管线只认清单里的本地图,
// 而且分享长图是同源取图(远程图会被跨域标脏、导不出来)。

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
/** 取图用这张尺寸(比封面大一点,裁切有余量),Picsum 会按 id 缩放 */
const SOURCE = '1600/900';
const CONCURRENCY = 4;

/** 人工筛过的 Picsum ID(见文件头的说明) */
const CURATED = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 24, 26,
  27, 28, 29, 33, 34, 36, 37, 42, 44, 45, 46, 47, 48, 50, 51, 54, 55, 56, 59,
  60, 61, 62, 63, 64, 65, 66, 68, 69, 70, 73, 74,
];

// frontmatter 的 cover 会原样进 <img src>,必须自带部署 base(正文图片则由 renderMarkdown 补,
// 两者不一样)。base 从 vite.config.ts 读,免得两处各写一份。
const BASE = (() => {
  const matched = readFileSync(join(ROOT, 'vite.config.ts'), 'utf8').match(
    /\bbase:\s*'([^']*)'/,
  );
  const value = matched?.[1] ?? '/';
  return value.endsWith('/') ? value : `${value}/`;
})();

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const positional = [];
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--index') {
    i += 1;
    continue;
  }
  if (args[i].startsWith('--')) continue;
  positional.push(args[i]);
}
const [slug] = positional;
const all = flag('all');
const dryRun = flag('dry-run');
const wantIndex = Number(option('index', '0')) || 0;

if (!slug && !all) {
  console.error(
    '用法:node scripts/fetch-cover.mjs <slug> [--dry-run] [--index 2]\n' +
      '     node scripts/fetch-cover.mjs --all [--dry-run]',
  );
  process.exit(1);
}

const pool = CURATED.map((id) => ({
  id,
  page: `https://unsplash.com/photos/${id}`,
  download: `https://picsum.photos/id/${id}/${SOURCE}`,
}));

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

/** slug → [0, n) 的稳定下标:同一篇文章每次都拿到同一张,不同文章错开 */
function hashIndex(text, size) {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % size;
}

function pickFor(postSlug, used) {
  const free = pool.filter((item) => !used.has(item.id));
  const candidates = free.length > 0 ? free : pool;
  return candidates[
    (hashIndex(postSlug, candidates.length) + wantIndex) % candidates.length
  ];
}

async function downloadCover(postSlug, url) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`下载失败:HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());

  mkdirSync(COVER_DIR, { recursive: true });
  // 裁成与自动封面 / 分享卡一致的 1200×630;position: attention 让 sharp 挑"信息最多"的区域
  const file = join(COVER_DIR, `${postSlug.replace(/\//g, '__')}.jpg`);
  const info = await sharp(buffer)
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(file);
  return { file, info, sourceBytes: buffer.length };
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
        const index = cursor;
        cursor += 1;
        results[index] = await worker(items[index]);
      }
    }),
  );
  return results;
}

// ---- 单篇 ----
if (!all) {
  const file = join(POSTS_DIR, `${slug}.md`);
  if (!existsSync(file)) {
    console.error(`找不到文章:src/posts/${slug}.md`);
    process.exit(1);
  }
  const hit = pickFor(slug, new Set());
  console.log(`文章:${slug}\n选中图:picsum #${hit.id}(${hit.page})`);
  if (dryRun) {
    console.log('\n--dry-run:只报告,没有下载也没有改 frontmatter');
    process.exit(0);
  }
  const { info, sourceBytes } = await downloadCover(slug, hit.download);
  writeCoverField(
    file,
    `${BASE}images/covers/${slug.replace(/\//g, '__')}.jpg`,
  );
  console.log(
    `\n封面已写入:public/images/covers/${slug.replace(/\//g, '__')}.jpg(${(info.size / 1024).toFixed(0)} KB,取自 ${(sourceBytes / 1024).toFixed(0)} KB 原图)`,
  );
  process.exit(0);
}

// ---- 批量 ----
const files = listPosts();
console.log(
  `批量:${files.length} 篇文章 × 图池 ${pool.length} 张(并发 ${CONCURRENCY})`,
);
const used = new Set();
const results = await mapWithLimit(files, CONCURRENCY, async (file) => {
  const postSlug = slugOf(file);
  const hit = pickFor(postSlug, used);
  used.add(hit.id);
  if (dryRun) return { slug: postSlug, ok: true, id: hit.id };
  try {
    const { info } = await downloadCover(postSlug, hit.download);
    writeCoverField(
      file,
      `${BASE}images/covers/${postSlug.replace(/\//g, '__')}.jpg`,
    );
    return { slug: postSlug, ok: true, id: hit.id, bytes: info.size };
  } catch (error) {
    return { slug: postSlug, ok: false, reason: error.message };
  }
});

const ok = results.filter((r) => r.ok);
const failed = results.filter((r) => !r.ok);
for (const item of failed) console.log(`  ✗ ${item.slug}:${item.reason}`);
if (dryRun) {
  for (const item of ok)
    console.log(`  ${item.slug.padEnd(46)} ← picsum #${item.id}`);
}
const total = ok.reduce((sum, item) => sum + (item.bytes ?? 0), 0);
console.log(
  `\n完成:成功 ${ok.length} 篇,失败 ${failed.length} 篇` +
    (dryRun
      ? '(dry-run,未下载)'
      : `,封面合计 ${(total / 1024 / 1024).toFixed(1)} MB`),
);
console.log(
  '不满意的单篇可以重挑:node scripts/fetch-cover.mjs <slug> --index 1',
);
if (failed.length > 0) process.exitCode = 1;
