// 图片管线:把 public/images 下的 jpg/png 压成 webp 响应式变体,并写一份清单
//
//   node scripts/optimize-images.mjs      (想用 npm run images 的话在 package.json 里加一行)
//
//   输入  public/images/foo.jpg        →  原图原样保留,当 <img> 的兜底
//   输出  public/images/foo-480.webp / foo-960.webp / foo-1600.webp(超过原宽的档位跳过)
//         public/images/images.manifest.json  { "/images/foo.jpg": { width, height, variants: [{ w, src }] } }
//
// 正文里的远程图(OSS)不归它管:渲染器只对清单里出现过的本地路径生成 <picture>。
// 幂等 —— 变体比源文件新就跳过,可反复运行(本地手动跑、CI 构建前跑都行)。

import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const IMAGES_DIR = join(ROOT, 'public', 'images');
const MANIFEST_FILE = join(IMAGES_DIR, 'images.manifest.json');

// 响应式档位:手机 / 平板 / 桌面 retina;原图比档位窄就跳过该档(放大只会糊)
const WIDTHS = [480, 960, 1600];
const WEBP_QUALITY = 78;
const SOURCE_EXT = /\.(jpe?g|png)$/i;

// 盘点还没放本地图片,安静退出,别让构建失败
if (!existsSync(IMAGES_DIR)) process.exit(0);

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      return SOURCE_EXT.test(entry.name) ? [full] : [];
    })
    .sort();

const mtime = (file) => statSync(file).mtimeMs;

const sources = walk(IMAGES_DIR);
const manifest = {};
let written = 0;
let skipped = 0;

for (const file of sources) {
  // 键用站点内的 URL 路径(不带部署 base),渲染器拿正文里的 /images/xxx.jpg 直接查表
  const rel = relative(IMAGES_DIR, file).replace(/\\/g, '/');
  const stem = rel.replace(SOURCE_EXT, ''); // 去掉扩展名、保留子目录,如 2024/foo
  const name = stem.slice(stem.lastIndexOf('/') + 1);
  const { width = 0, height = 0 } = await sharp(file).metadata();

  const variants = [];
  for (const w of WIDTHS) {
    if (!width || w > width) continue;
    const out = join(dirname(file), `${name}-${w}.webp`);
    variants.push({ w, src: `/images/${stem}-${w}.webp` });
    // 变体比源图新说明源图没改过,直接复用
    if (existsSync(out) && mtime(out) > mtime(file)) {
      skipped += 1;
      continue;
    }
    await sharp(file)
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toFile(out);
    written += 1;
  }

  manifest[`/images/${rel}`] = { width, height, variants };
}

// 顺序稳定,内容没变就不落盘 —— 免得开发时白触发一次整页刷新
const json = `${JSON.stringify(manifest, null, 2)}\n`;
if (
  !existsSync(MANIFEST_FILE) ||
  readFileSync(MANIFEST_FILE, 'utf8') !== json
) {
  writeFileSync(MANIFEST_FILE, json, 'utf8');
}

console.log(
  `图片管线:新生成 ${written} 个 webp 变体,复用 ${skipped} 个,清单收录 ${sources.length} 张原图`,
);
console.log(`清单:${relative(ROOT, MANIFEST_FILE).replace(/\\/g, '/')}`);
