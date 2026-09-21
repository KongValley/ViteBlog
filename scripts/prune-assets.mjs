// 构建产物瘦身:删掉 dist 里**永远不会被下载**的旧格式字体。
//
// @fontsource 的 @font-face 里同时给了 woff2 / woff(有些还带 ttf)三种 src,
// 浏览器按 src 顺序只挑第一个认识的 —— 也就是 woff2 —— 后面的文件纯粹是白占体积。
// 实测 dist/assets 里这类文件有 3.3 MB,其中 woff/ttf 占 2.4 MB。
//
//   node scripts/prune-assets.mjs
//
// 挂在 postbuild 上自动跑;只删 dist 里的产物,不动 node_modules(构建期的 satori
// 还要从 node_modules 读 woff 渲染分享图)。

import { readdir, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ASSETS = join(ROOT, 'dist', 'assets');
const LEGACY = /\.(woff|ttf|otf|eot)$/i;

const entries = await readdir(ASSETS).catch(() => []);
const legacy = entries.filter((name) => LEGACY.test(name));

let freed = 0;
for (const name of legacy) {
  const file = join(ASSETS, name);
  freed += (await stat(file)).size;
  await unlink(file);
}

if (legacy.length === 0) {
  console.log('产物瘦身:没有需要清理的旧格式字体');
} else {
  console.log(
    `产物瘦身:清掉 ${legacy.length} 个 woff/ttf 老格式字体,少发 ${(freed / 1024 / 1024).toFixed(1)} MB(浏览器只下载 woff2)`,
  );
}
