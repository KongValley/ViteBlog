// 构建期生成分享卡:每篇文章一张 1200×630 的 PNG,给 <meta og:image> 用。
//
//   node scripts/build-og.mjs   → dist/og/<slug 里的 / 换成 __>.png
//
// 渲染链与字体说明见 scripts/lib/cards.mjs(与自动封面共用)。

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import satori from 'satori';
import sharp from 'sharp';
import { parse as parseYaml } from 'yaml';
import {
  BG,
  block,
  CONCURRENCY,
  EMOJI,
  HEIGHT,
  h,
  INK,
  listPosts,
  loadFonts,
  MUTED,
  mapWithLimit,
  POSTS_DIR,
  RED,
  ROOT,
  readPost,
  WIDTH,
} from './lib/cards.mjs';

const OUT_DIR = join(ROOT, 'dist', 'og');

// 标题可用宽度 = 卡片宽 - 左右内边距,再乘一点安全系数:Minecraft 式的像素字体
// 每个拉丁字符几乎占满一格,估算偏乐观就会把标题挤成「末行只剩一个字」
const TITLE_WIDTH = (WIDTH - 76 * 2) * 0.94;
const TITLE_SIZES = [88, 72, 58, 48, 40, 34];

/** 粗略排版宽度(单位 em):中日韩占满一格、拉丁字符接近一格、空格半格 */
const visualLength = (text) =>
  [...text].reduce(
    (sum, char) =>
      sum +
      (/[\u2e80-\u9fff\uff00-\uffef]/.test(char)
        ? 1
        : /\s/.test(char)
          ? 0.6
          : 1),
    0,
  );

// 挑字号:优先 1~2 行且每行别太空(行数多了/末行只剩一两个字都难看),
// 退而求其次容忍 3 行,都不满足就用最大字号(短标题走这条)
function titleSize(title) {
  const units = visualLength(title);
  const linesAt = (size) => Math.ceil((units * size) / TITLE_WIDTH);
  const pick = (maxLines, minFill) =>
    TITLE_SIZES.find((size) => {
      const lines = linesAt(size);
      return (
        lines <= maxLines && (units * size) / lines >= TITLE_WIDTH * minFill
      );
    });
  return (
    pick(2, 0.55) ??
    pick(3, 0.42) ??
    TITLE_SIZES.find((size) => linesAt(size) <= 3) ??
    TITLE_SIZES.at(-1)
  );
}

function card({ title, site, date, minutes }) {
  const size = titleSize(title);
  return h(
    'div',
    {
      width: `${WIDTH}px`,
      height: `${HEIGHT}px`,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative',
      background: BG,
      padding: '64px 76px',
      fontFamily: '"Press Start 2P", "Noto Sans SC"',
      overflow: 'hidden',
    },
    // 顶部像素装饰带:递减的方块 + 一条暗红细线,像像素游戏的血条
    h(
      'div',
      { display: 'flex', alignItems: 'flex-end', gap: '14px', flexShrink: 0 },
      block(30),
      block(22),
      block(16),
      block(10),
      h('div', {
        display: 'flex',
        flexGrow: 1,
        height: '6px',
        background: RED,
        opacity: 0.4,
      }),
    ),
    // 中间标题:最多 4 行,超了省略号
    h(
      'div',
      {
        display: 'flex',
        flexGrow: 1,
        alignItems: 'center',
        padding: '36px 0',
      },
      h(
        'div',
        {
          display: 'flex',
          flexDirection: 'column',
          color: INK,
          fontSize: `${size}px`,
          lineHeight: 1.42,
          letterSpacing: '1px',
          lineClamp: 4,
        },
        title,
      ),
    ),
    // 页脚:左边站名,右边日期 + 阅读时长
    h(
      'div',
      {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        flexShrink: 0,
      },
      h(
        'div',
        { display: 'flex', alignItems: 'center', gap: '14px' },
        block(14, RED, 0.9),
        h(
          'div',
          {
            display: 'flex',
            color: RED,
            fontSize: '26px',
            letterSpacing: '1px',
          },
          site,
        ),
      ),
      h(
        'div',
        {
          display: 'flex',
          color: MUTED,
          fontSize: '22px',
          letterSpacing: '1px',
        },
        `${date} · ${minutes} 分钟`,
      ),
    ),
    // 右上角像素簇:压在装饰带旁边,补一块画面重心
    h(
      'div',
      {
        display: 'flex',
        position: 'absolute',
        top: '52px',
        right: '60px',
        gap: '10px',
      },
      block(18, RED, 0.75),
      block(34, RED, 0.55),
      block(14, RED, 0.35),
    ),
  );
}

async function main() {
  const started = Date.now();
  const site = parseYaml(await readFile(join(ROOT, 'site.yml'), 'utf8'));
  const siteName = site?.name ?? 'Blog';

  const files = await listPosts();
  if (files.length === 0) {
    console.error(
      `没有在 ${relative(ROOT, POSTS_DIR)} 下找到任何 .md,先写一篇再来`,
    );
    process.exitCode = 1;
    return;
  }

  const [fonts] = await Promise.all([
    loadFonts(),
    mkdir(OUT_DIR, { recursive: true }),
  ]);

  const results = await mapWithLimit(files, CONCURRENCY, async (file) => {
    try {
      const post = await readPost(file);
      // 标题里只剩 emoji 时留个站名,免得卡片上空一块
      const clean = (title) => {
        const text = title.replace(EMOJI, '').replace(/\s+/g, ' ').trim();
        return text || siteName;
      };
      const svg = await satori(
        card({ ...post, title: clean(post.title), site: siteName }),
        { width: WIDTH, height: HEIGHT, fonts },
      );
      const png = await sharp(Buffer.from(svg))
        .png({ compressionLevel: 9 })
        .toBuffer();
      const out = join(OUT_DIR, `${post.slug.replace(/\//g, '__')}.png`);
      await writeFile(out, png);
      return { slug: post.slug, ok: true, bytes: png.length };
    } catch (error) {
      return {
        slug: relative(POSTS_DIR, file).replace(/\\/g, '/'),
        ok: false,
        error,
      };
    }
  });

  const ok = results.filter((item) => item.ok);
  const failed = results.filter((item) => !item.ok);
  const total = ok.reduce((sum, item) => sum + item.bytes, 0);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);

  console.log(
    `分享卡已生成:成功 ${ok.length} 篇,失败 ${failed.length} 篇,用时 ${seconds}s`,
  );
  console.log(
    `输出目录:${relative(ROOT, OUT_DIR).replace(/\\/g, '/')}(${(total / 1024).toFixed(0)} KB)`,
  );
  for (const item of failed) {
    console.error(`  ✗ ${item.slug}:${item.error?.message ?? item.error}`);
  }
  // 全失败才让构建挂掉;单篇出错(比如标题里有字体渲染不了的字)不该拖垮发布
  if (ok.length === 0) process.exitCode = 1;
}

await main();
