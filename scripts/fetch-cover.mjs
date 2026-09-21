// 给某篇文章找一张真实图片当封面。
//
//   node scripts/fetch-cover.mjs <slug> [关键词] [--dry-run] [--index 2] [--license cc0,pdm]
//
// 图源用 Openverse(https://openverse.org 的公开 API,免密钥),默认只收 CC0 / 公有领域 ——
// 这类授权不需要署名,省掉「文章页还得挂一行出处」的麻烦。想用 CC-BY 这类需要署名的,
// 自己加 --license 后请务必在正文里补上作者与许可(脚本会把来源打印出来)。
//
// 下载后会裁成 1200×630(与自动封面、分享卡一致),落到 public/images/covers/<slug>.jpg,
// 并写进 frontmatter 的 cover 字段;落在 public/images/ 下才能吃到构建期的 webp 变体与
// width/height(srcset 那套),而且分享长图是同源取图,不会被跨域标脏。
//
// 不指定关键词就用文章标题 + 标签去搜。

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { parseFrontmatter } from '../src/data/frontmatter.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const POSTS_DIR = join(ROOT, 'src', 'posts');
const COVER_DIR = join(ROOT, 'public', 'images', 'covers');
const WIDTH = 1200;
const HEIGHT = 630;

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

// 参数:第一个非选项是 slug,后面的非选项都是关键词;--key value 形式的选项要跳过它的值
const positional = [];
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--index' || arg === '--license') {
    i += 1;
    continue;
  }
  if (arg.startsWith('--')) continue;
  positional.push(arg);
}
const [slug, ...queryParts] = positional;
if (!slug) {
  console.error(
    '用法:node scripts/fetch-cover.mjs <slug> [关键词] [--dry-run] [--index 2] [--license cc0,pdm]',
  );
  process.exit(1);
}

const file = join(POSTS_DIR, `${slug}.md`);
if (!existsSync(file)) {
  console.error(`找不到文章:src/posts/${slug}.md`);
  process.exit(1);
}

const { meta } = parseFrontmatter(readFileSync(file, 'utf8'));
const query =
  queryParts.join(' ').trim() ||
  [meta.title ?? '', ...(meta.tags ?? [])].join(' ');
const license = option('license', 'cc0,pdm');
const wantIndex = Number(option('index', '0')) || 0;
const dryRun = flag('dry-run');

console.log(`文章:${slug}`);
console.log(`搜索词:${query}`);
console.log(`授权过滤:${license}`);

const search = new URL('https://api.openverse.org/v1/images/');
search.searchParams.set('q', query);
search.searchParams.set('license', license);
search.searchParams.set('page_size', '20');
// 只要横图:封面框是 1200×630,竖图裁出来只剩中间一小条
search.searchParams.set('aspect_ratio', 'wide');
search.searchParams.set('size', 'large');

const response = await fetch(search, {
  headers: {
    'user-agent': 'ViteBlog cover fetcher (personal blog build script)',
  },
});
if (!response.ok) {
  console.error(`Openverse 接口返回 HTTP ${response.status}`);
  process.exit(1);
}
const payload = await response.json();
// Openverse 的 width/height 说的是原图,url 有时指向图床的缩略图(type=thumb / 960w 之类)——
// 那种当封面要放大,糊。把疑似缩略图的排到后面去,优先用能拿到的大图。
const THUMBISH = /(thumb|\/960w|\/640w|-small|\.svg)/i;
const candidates = (payload.results ?? [])
  .filter((item) => item.width >= WIDTH && item.url)
  .sort((a, b) => Number(THUMBISH.test(a.url)) - Number(THUMBISH.test(b.url)));

if (candidates.length === 0) {
  console.error('没有合适的候选(试试换个关键词,或放宽 --license)');
  process.exit(1);
}

console.log(`\n候选 ${candidates.length} 个:`);
candidates.slice(0, 6).forEach((item, index) => {
  console.log(
    `  [${index}] ${String(item.title ?? '(无题)').slice(0, 46)}  ${item.license.toUpperCase()}  ${item.width}×${item.height}  ${item.creator ?? '未知作者'}`,
  );
});

const pick = candidates[Math.min(wantIndex, candidates.length - 1)];
console.log(
  `\n选中 [${Math.min(wantIndex, candidates.length - 1)}]:${pick.url}`,
);
if (pick.license !== 'cc0' && pick.license !== 'pdm') {
  console.log(
    `⚠ 这张是 ${pick.license.toUpperCase()},需要署名:作者 ${pick.creator ?? '未知'},来源 ${pick.foreign_landing_url ?? pick.url}`,
  );
}

if (dryRun) {
  console.log('\n--dry-run:只报告,没有下载也没有改 frontmatter');
  process.exit(0);
}

const image = await fetch(pick.url, {
  headers: {
    'user-agent': 'ViteBlog cover fetcher (personal blog build script)',
  },
});
if (!image.ok) {
  console.error(`下载图片失败:HTTP ${image.status}`);
  process.exit(1);
}
const buffer = Buffer.from(await image.arrayBuffer());

// 裁成与自动封面 / 分享卡一致的 1200×630;position: attention 让 sharp 挑"信息最多"的区域
mkdirSync(COVER_DIR, { recursive: true });
const coverPath = join(COVER_DIR, `${slug.replace(/\//g, '__')}.jpg`);
const info = await sharp(buffer)
  .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'attention' })
  .jpeg({ quality: 84, mozjpeg: true })
  .toFile(coverPath);

const coverUrl = `${BASE}images/covers/${slug.replace(/\//g, '__')}.jpg`;
console.log(
  `\n封面已写入:public${coverUrl}(${info.width}×${info.height},${(info.size / 1024).toFixed(0)} KB,取自 ${(buffer.length / 1024).toFixed(0)} KB 原图)`,
);

// 写回 frontmatter:已有 cover 就替换,没有就插在 date 行后面
const raw = readFileSync(file, 'utf8');
const block = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
if (!block) {
  console.error('这篇文章没有 frontmatter,请手动加 cover 字段');
  process.exit(1);
}
const lines = block[1].split(/\r?\n/);
const coverLine = `cover: ${coverUrl}`;
const existing = lines.findIndex((line) => line.startsWith('cover:'));
if (existing >= 0) {
  lines[existing] = coverLine;
} else {
  const dateAt = lines.findIndex((line) => line.startsWith('date:'));
  lines.splice(dateAt >= 0 ? dateAt + 1 : lines.length, 0, coverLine);
}
const updated = raw.replace(block[1], lines.join('\n'));
writeFileSync(file, updated);
console.log(`frontmatter 已更新:${file.replace(ROOT, '').replace(/\\/g, '/')}`);

// 顺手跑一次图片管线,让 webp 变体与清单立刻就位
const { spawnSync } = await import('node:child_process');
spawnSync(process.execPath, [join(ROOT, 'scripts', 'optimize-images.mjs')], {
  stdio: 'inherit',
});
console.log(
  `\n完成。可用 \`npm run dev\` 看效果;\`git checkout src/posts/${slug}.md\` 可撤销。`,
);
