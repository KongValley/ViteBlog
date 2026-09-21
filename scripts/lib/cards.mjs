// 构建期卡片渲染的公共件:OG 分享卡(scripts/build-og.mjs)与自动封面
// (scripts/build-covers.mjs)共用。
//
// 渲染链:satori 把元素树画成 SVG(字形直接内嵌成 path,不依赖系统字体),
// 再交给 sharp 转 PNG —— sharp 本来就在 devDependencies 里,省掉一个原生依赖。
//
// 字体:press-start-2p(拉丁/数字/符号,像素风)+ noto-sans-sc 的 chinese-simplified
// 子集(中文兜底)。两套都是 woff,satori 不认 woff2,所以不能直接用 files/ 里的 woff2。

import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { countWords, parseFrontmatter } from '../../src/data/frontmatter.ts';

export const ROOT = fileURLToPath(new URL('../..', import.meta.url));
export const POSTS_DIR = join(ROOT, 'src', 'posts');
export const FONT_DIR = join(ROOT, 'node_modules', '@fontsource');
export const STICKER_DIR = join(ROOT, 'public', 'icons', 'stickers');
export const SITE_FILE = join(ROOT, 'site.yml');

export const WIDTH = 1200;
export const HEIGHT = 630;
/** sharp 转码是 CPU 活,开太多反而互相抢核;4 个足够把 50 篇压到几秒 */
export const CONCURRENCY = 4;

export const BG = '#0f0e17';
export const RED = '#e43d44';
export const INK = '#fffffe';
export const MUTED = '#a7a9be';
/** 卡片里的暗红:当纹理用,不抢主体 */
export const RED_DEEP = '#5a1119';

// 排版用不上 emoji(字体里没有,渲染出来是空框),顺手把它们从标题里摘掉。
// 字符类里不能混进组合字符(FE0F/20E3/200D),所以用 alternation 写
export const EMOJI =
  /\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}|\u{FE0F}|\u{20E3}|\u{200D}/gu;

/** satori 只认 React 元素形状(type/props),这里手搓一个,省掉 JSX 编译 */
export const h = (type, style, ...children) => {
  const kids = children
    .flat()
    .filter((child) => child !== null && child !== '');
  // satori 规定:children 是数组时 div 必须显式 display:flex。单个字符串孩子直接摊平,
  // 免得纯装饰用的空 div / 单行文本也要挂一堆 display
  return {
    type,
    props: {
      style,
      children:
        kids.length === 0 ? undefined : kids.length === 1 ? kids[0] : kids,
    },
  };
};

/** 一个像素方块,红黑配色里的装饰都靠它拼 */
export const block = (size, color = RED, opacity = 1) =>
  h('div', {
    width: `${size}px`,
    height: `${size}px`,
    background: color,
    opacity,
    flexShrink: 0,
  });

/** 绝对定位的像素方块(x/y/w/h 相对卡片左上角,单位 px) */
export const rectAt = (x, y, width, height, color = RED_DEEP, opacity = 1) =>
  h('div', {
    position: 'absolute',
    left: `${x}px`,
    top: `${y}px`,
    width: `${width}px`,
    height: `${height}px`,
    background: color,
    opacity,
  });

/** 字体只读一次,几十篇共用;Buffer 给 satori 直接解析 */
export async function loadFonts() {
  const [latin, cjk] = await Promise.all([
    readFile(
      join(
        FONT_DIR,
        'press-start-2p/files/press-start-2p-latin-400-normal.woff',
      ),
    ),
    readFile(
      join(
        FONT_DIR,
        'noto-sans-sc/files/noto-sans-sc-chinese-simplified-400-normal.woff',
      ),
    ),
  ]);
  return [
    { name: 'Press Start 2P', data: latin, weight: 400, style: 'normal' },
    { name: 'Noto Sans SC', data: cjk, weight: 400, style: 'normal' },
  ];
}

/** 扫 src/posts 下的所有 .md,slug 规则与 vite 的 postsIndex 插件保持一致 */
export async function listPosts() {
  const entries = await readdir(POSTS_DIR, {
    withFileTypes: true,
    recursive: true,
  });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => join(entry.parentPath ?? POSTS_DIR, entry.name))
    .sort();
}

export async function readPost(file) {
  const raw = await readFile(file, 'utf8');
  const { meta, content } = parseFrontmatter(raw);
  const words = countWords(content);
  return {
    slug: relative(POSTS_DIR, file).replace(/\\/g, '/').replace(/\.md$/, ''),
    title: meta.title ?? '未命名文章',
    // 收起:文章日期可能是 "2026-09-15" 也可能是 "2020-01-17 10:59:08"
    date: (meta.date ?? '').slice(0, 10),
    tags: meta.tags ?? [],
    categories: meta.categories ?? [],
    cover: meta.cover ?? '',
    minutes: Math.max(1, Math.round(words / 400)),
  };
}

/** 固定并发跑任务,单篇抛错只记在自己的结果里 */
export async function mapWithLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await worker(items[index]);
      }
    },
  );
  await Promise.all(runners);
  return results;
}

/** slug → [0,1) 的确定性随机源:同一篇文章每次都画同一张图 */
export function seededRandom(text) {
  // FNV-1a:短字符串也散得开,免得相邻 slug 的图长得一样
  let seed = 2166136261;
  for (const char of text) {
    seed ^= char.codePointAt(0);
    seed = Math.imul(seed, 16777619);
  }
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** 按 slug 稳定地挑一张贴纸(105 张像素贴纸,同名的两次跑结果一致) */
export async function pickSticker(slug) {
  const names = (await readdir(STICKER_DIR))
    .filter((name) => name.endsWith('.svg'))
    .sort();
  if (names.length === 0) return null;
  const random = seededRandom(slug);
  const name = names[Math.floor(random() * names.length)];
  return { name, svg: await readFile(join(STICKER_DIR, name), 'utf8') };
}
