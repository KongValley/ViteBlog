// 自动封面:给「frontmatter 里没写 cover」的文章生成一张 1200×630 的像素风封面。
//
//   node scripts/build-covers.mjs [--force]   → public/covers/<slug 里的 / 换成 __>.png
//
// 为什么落在 public/ 而不是 dist/:
//   封面是页面上真实显示的 <img>(首页卡片、文章头图、分享图顶部),dev server 也得能取到;
//   放 public 则 dev 与构建同时可用,而且是同源资源 —— 分享图把它画进 canvas 不会被跨域标脏。
//
// 画面 = 这篇文章在首页用的那个像素图案(同一套 getPostIcon)+ 按 slug 确定性铺开的底纹方块
// + 分类名。刻意不放标题和日期:首页卡片、文章头图、分享图上标题都另有位置,再来一遍就是重复;
// 分类名只在文章页出现,放封面上不重样。
//
// 幂等:输出比 .md、脚本自身和用到的数据模块都新就跳过(除非 --force),
// 所以挂在 predev/prebuild 上不会拖慢每次启动。

import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import sharp from 'sharp';
import { parseFrontmatter } from '../src/data/frontmatter.ts';
import { ICON_SIZE, sprites24 } from '../src/data/pixelSprites.ts';
import { getPostIcon, stickerFileOf } from '../src/data/postIcons.ts';
import {
  BG,
  block,
  CONCURRENCY,
  HEIGHT,
  h,
  listPosts,
  loadFonts,
  MUTED,
  mapWithLimit,
  POSTS_DIR,
  RED,
  RED_DEEP,
  ROOT,
  rectAt,
  seededRandom,
  WIDTH,
} from './lib/cards.mjs';

const OUT_DIR = join(ROOT, 'public', 'covers');
const STICKER_DIR = join(ROOT, 'public', 'icons', 'stickers');
const FORCE = process.argv.includes('--force');

// 暗色主题下这些精灵才看得清:取 src/themes/pixel/style.css 里暗色模式那套值。
// 组件那边用的是 CSS 变量(跟随主题),构建期没有主题上下文,只能按固定的来。
const SPRITE_COLORS = {
  y: '#ffd75e',
  r: '#ff5c5c',
  b: '#6fb7ff',
  c: '#3cbcfc',
  g: '#3ce06a',
  k: '#8996b2',
  x: '#1a1c2c',
  n: '#f8b878',
  m: '#aa8cff',
  d: '#b8b8b8',
  w: '#fffbe8',
  o: '#f87858',
};

/** 像素图案的方块边长:24 × 11 = 264 —— 首页卡片会把封面裁成中间一条(约 282px 高),
 *  尺寸压到这个窄带以内,卡片里看到的图案才是完整的 */
const CELL = 11;
/** 画框(图案外面那圈)的边长与位置 */
const PLATE = 300;
const PLATE_X = WIDTH - 76 - PLATE;
const PLATE_Y = Math.round((HEIGHT - PLATE) / 2);
/** 图案在画框里居中:手绘精灵按 24 格铺,贴纸按 312px 缩放 */
const ART = ICON_SIZE * CELL;
const ART_X = PLATE_X + Math.round((PLATE - ART) / 2);
const ART_Y = PLATE_Y + Math.round((PLATE - ART) / 2);

/**
 * 底纹:画布上稀疏的暗红方格,越往左上越密,把视线推到右边的图案上。
 * 位置由 seededRandom(slug) 决定 —— 同一篇文章每次生成同一张图。
 */
function backdrop(slug) {
  const random = seededRandom(`${slug}:backdrop`);
  const cells = [];
  const size = 58;
  const cols = Math.ceil(WIDTH / size);
  const rows = Math.ceil(HEIGHT / size);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = col * size;
      const y = row * size;
      // 右半边留给画框,别再往上叠方块
      if (x + size > PLATE_X - 24) continue;
      const density = 0.62 - (x / WIDTH) * 0.44 - (y / HEIGHT) * 0.12;
      if (random() > density) continue;
      const bright = random() > 0.93;
      cells.push(
        rectAt(
          x + 5,
          y + 5,
          size - 10,
          size - 10,
          bright ? RED : RED_DEEP,
          bright ? 0.32 : 0.1 + random() * 0.14,
        ),
      );
    }
  }
  return cells;
}

/** 把 24×24 的字符画铺成像素方块(同色连排的格子合并成一条,少几个节点) */
function sprite(rows) {
  const squares = [];
  rows.forEach((row, y) => {
    for (const match of row.matchAll(/([a-z])\1*/g)) {
      const color = SPRITE_COLORS[match[1]];
      // 调色板和字符画是两份数据,少一个字母就会缺像素 —— 与其画歪不如直接报错
      if (!color) throw new Error(`精灵调色板缺少字母 ${match[1]}`);
      squares.push(
        rectAt(
          ART_X + (match.index ?? 0) * CELL,
          ART_Y + y * CELL,
          match[0].length * CELL,
          CELL,
          color,
        ),
      );
    }
  });
  return squares;
}

/** 贴纸图案:矢量放大到 ART 见方(先按密度栅格化,再最近邻缩,保持硬边) */
async function sticker(name) {
  const svg = await readFile(join(STICKER_DIR, `${name}.svg`), 'utf8');
  const png = await sharp(Buffer.from(svg), { density: 720 })
    .resize(ART, ART, { fit: 'contain', kernel: 'nearest' })
    .png()
    .toBuffer();
  // satori 的 <img> 要 props.src(不是 style 里的 src),所以这里不借 h() 的手
  return {
    type: 'img',
    props: {
      src: `data:image/png;base64,${png.toString('base64')}`,
      width: ART,
      height: ART,
      style: {
        position: 'absolute',
        left: `${ART_X}px`,
        top: `${ART_Y}px`,
        width: `${ART}px`,
        height: `${ART}px`,
      },
    },
  };
}

/** 画框:深色底板 + 四个角的红方块,像素游戏里的道具框 */
function plate() {
  const corner = 14;
  const offset = corner / 2;
  return [
    rectAt(PLATE_X, PLATE_Y, PLATE, PLATE, '#191a28'),
    rectAt(PLATE_X - offset, PLATE_Y - offset, corner, corner, RED),
    rectAt(PLATE_X + PLATE - offset, PLATE_Y - offset, corner, corner, RED),
    rectAt(PLATE_X - offset, PLATE_Y + PLATE - offset, corner, corner, RED),
    rectAt(
      PLATE_X + PLATE - offset,
      PLATE_Y + PLATE - offset,
      corner,
      corner,
      RED,
    ),
  ];
}

/** 左上角的像素方块 + 细线,和分享卡同一套视觉语言 */
function cornerBar() {
  return h(
    'div',
    {
      position: 'absolute',
      left: '76px',
      top: '64px',
      display: 'flex',
      alignItems: 'flex-end',
      gap: '14px',
    },
    ...[30, 22, 16, 10].map((size) =>
      h('div', {
        width: `${size}px`,
        height: `${size}px`,
        background: RED,
        flexShrink: 0,
      }),
    ),
    h('div', {
      width: '180px',
      height: '6px',
      background: RED,
      opacity: 0.35,
    }),
  );
}

/** 左下角:分类名(标题另有位置,这里只放卡片和正文里不显眼的那点信息) */
function category(categories) {
  if (categories.length === 0) return null;
  return h(
    'div',
    {
      position: 'absolute',
      left: '76px',
      bottom: '72px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      color: MUTED,
      fontSize: '24px',
      letterSpacing: '2px',
    },
    block(14),
    categories.slice(0, 2).join(' / '),
  );
}

/** 一张封面:底纹 + 画框 + 该文的像素图案 + 角落装饰 */
async function cover({ slug, categories }) {
  const name = getPostIcon(slug);
  const file = stickerFileOf(name);
  const art = file
    ? await sticker(file)
    : sprite(sprites24[name] ?? sprites24.star);
  return h(
    'div',
    {
      width: `${WIDTH}px`,
      height: `${HEIGHT}px`,
      position: 'relative',
      display: 'flex',
      background: BG,
      fontFamily: '"Press Start 2P", "Noto Sans SC"',
      overflow: 'hidden',
    },
    ...backdrop(slug),
    ...plate(),
    art,
    cornerBar(),
    category(categories),
  );
}

/** 输出比这些输入都新就可以跳过 */
async function inputsChanged(out, files) {
  try {
    const target = (await stat(out)).mtimeMs;
    const sources = await Promise.all(
      files.map(async (file) => (await stat(file)).mtimeMs),
    );
    return sources.some((time) => time > target);
  } catch {
    return true;
  }
}

/** 封面只由这些文件决定(改表里的任何一个都会全部重画) */
const TRACKED = [
  import.meta.url,
  './lib/cards.mjs',
  '../src/data/pixelSprites.ts',
  '../src/data/postIcons.ts',
  '../src/data/stickerIcons.ts',
].map((path) =>
  path.startsWith('file:')
    ? fileURLToPath(path)
    : fileURLToPath(new URL(path, import.meta.url)),
);

async function main() {
  const started = Date.now();
  const files = await listPosts();
  if (files.length === 0) {
    console.error(`没有在 ${relative(ROOT, POSTS_DIR)} 下找到任何 .md`);
    process.exitCode = 1;
    return;
  }

  const [fonts] = await Promise.all([
    loadFonts(),
    mkdir(OUT_DIR, { recursive: true }),
  ]);

  const results = await mapWithLimit(files, CONCURRENCY, async (file) => {
    const slug = relative(POSTS_DIR, file)
      .replace(/\\/g, '/')
      .replace(/\.md$/, '');
    const out = join(OUT_DIR, `${slug.replace(/\//g, '__')}.png`);
    try {
      if (!FORCE && (await inputsChanged(out, [file, ...TRACKED])) === false) {
        return { slug, skipped: true };
      }
      const { meta } = parseFrontmatter(await readFile(file, 'utf8'));
      const svg = await satori(
        await cover({ slug, categories: meta.categories ?? [] }),
        { width: WIDTH, height: HEIGHT, fonts },
      );
      const png = await sharp(Buffer.from(svg))
        .png({ compressionLevel: 9, palette: true })
        .toBuffer();
      await writeFile(out, png);
      return { slug, ok: true, bytes: png.length };
    } catch (error) {
      return { slug, ok: false, error };
    }
  });

  const ok = results.filter((item) => item.ok);
  const skipped = results.filter((item) => item.skipped);
  const failed = results.filter((item) => !item.ok && !item.skipped);
  const total = ok.reduce((sum, item) => sum + item.bytes, 0);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);

  console.log(
    `封面已生成:新画 ${ok.length} 篇,跳过 ${skipped.length} 篇,失败 ${failed.length} 篇,用时 ${seconds}s`,
  );
  if (ok.length > 0) {
    console.log(
      `输出目录:${relative(ROOT, OUT_DIR).replace(/\\/g, '/')}(新画部分 ${(total / 1024).toFixed(0)} KB)`,
    );
  }
  for (const item of failed) {
    console.error(`  ✗ ${item.slug}:${item.error?.message ?? item.error}`);
  }
  if (failed.length > 0 && ok.length === 0) process.exitCode = 1;
}

await main();
