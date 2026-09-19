// 四套新主题的"真站点"静态预览服务器(仅用于本地验证,不参与正式部署)
// 用法:先逐个主题构建并把 dist 拷进 design-preview/out/<theme>/,
//      再 node design-preview/serve-dist.mjs
// 每个主题独占一个端口,统一按 GitHub Pages 的子路径 /ViteBlog/ 提供文件,
// 与线上路径保持一致(构建产物的资源请求都是绝对路径 /ViteBlog/assets/…)

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, 'design-preview', 'out');
const BASE = '/ViteBlog/';
const HOST = '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

// 主题 → 预览端口
const VARIANTS = [
  ['brutalist', 4191],
  ['bento', 4192],
  ['terminal', 4193],
  ['glass', 4194],
];

for (const [theme, port] of VARIANTS) {
  const dir = join(OUT, theme);
  if (!existsSync(dir)) {
    console.log(`跳过 ${theme}:缺少 ${dir}(先构建该主题)`);
    continue;
  }

  createServer(async (req, res) => {
    try {
      let path = decodeURIComponent((req.url ?? '/').split('?')[0]);
      if (path === '/' || path === '') {
        res.writeHead(302, { location: BASE });
        res.end();
        return;
      }
      if (!path.startsWith(BASE)) throw new Error('outside base');
      let rel = path.slice(BASE.length);
      if (rel === '' || rel.endsWith('/')) rel += 'index.html';
      let file = normalize(join(dir, rel));
      if (!file.startsWith(dir)) throw new Error('forbidden');

      let body;
      try {
        body = await readFile(file);
      } catch {
        // SPA 深链回退:/ViteBlog/post/xxx 直接刷新时同样给出 index.html
        file = 'index.html';
        body = await readFile(join(dir, 'index.html'));
      }

      res.writeHead(200, {
        'content-type':
          MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
        'cache-control': 'no-cache',
      });
      res.end(body);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
    }
  }).listen(port, HOST, () => {
    console.log(`${theme.padEnd(10)} → http://localhost:${port}${BASE}`);
  });
}
