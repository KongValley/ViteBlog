// 构建期产物:把 public/favicon.svg(8×8 的像素心形)光栅化成 iOS 主屏图标
// public/apple-touch-icon.png(180×180),供 index.html 的 apple-touch-icon 用。
//
//   node scripts/build-icons.mjs
//
// 产物是构建期生成物(和 dist/ 里的东西一样不进版本库),由 prebuild 钩子调用;
// sharp 已在 devDependencies 里。脚本只读 public/favicon.svg,可重复执行。

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SOURCE = join(ROOT, 'public', 'favicon.svg');
const TARGET = join(ROOT, 'public', 'apple-touch-icon.png');

// apple-touch-icon 的规范尺寸;favicon.svg 的 viewBox 是 8×8
const SIZE = 180;
const SOURCE_SIZE = 8;
// 按 180 / 8 = 22.5 倍密度光栅化,SVG 直接渲染成 180px,像素格边缘不发毛
const DENSITY = (72 * SIZE) / SOURCE_SIZE;

// 心形之外是透明的,iOS 会把透明处压成黑底,所以先补一层主题底色(像素风的纸色)
const BACKGROUND = { r: 0xf7, g: 0xed, b: 0xd5, alpha: 1 };

const png = await sharp(readFileSync(SOURCE), { density: DENSITY })
  .resize(SIZE, SIZE, { fit: 'contain' })
  .flatten({ background: BACKGROUND })
  .png({ compressionLevel: 9 })
  .toBuffer();

writeFileSync(TARGET, png);
console.log(`[build-icons] public/apple-touch-icon.png ${SIZE}×${SIZE}`);
