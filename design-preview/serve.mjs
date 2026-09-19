// 设计预览本地服务器(仅用于 design-preview 里的 Demo,不影响正式站点)
// 用法:node design-preview/serve.mjs  → 打开 http://localhost:4180/design-preview/index.html
// 根目录指向仓库根,页面里的 ../node_modules 字体路径才能正常解析
// 端口用 4180(避开 vite dev 的 5173 与 vite preview 的 4173),只监听本机

import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 4180;
const HOST = '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

createServer(async (req, res) => {
  try {
    let path = decodeURIComponent((req.url ?? '/').split('?')[0]);
    if (path.endsWith('/')) path += 'index.html';
    const file = normalize(join(ROOT, path));
    if (!file.startsWith(ROOT)) throw new Error('forbidden');
    const body = await readFile(file);
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
}).listen(PORT, HOST, () => {
  console.log(
    `design-preview  →  http://localhost:${PORT}/design-preview/index.html`,
  );
});
