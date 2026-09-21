// 真站点冒烟:起一个静态服务器托管 dist,用无头 Chrome 打开几个关键页面,
// 检查「页面真的渲染出来了 + 控制台没有报错 + 关键元素在」,必要时留一张截图。
//
//   node design-preview/smoke.mjs            (需要先 npm run build)
//   node design-preview/smoke.mjs --shots    (额外把每个页面的全页截图写到 design-preview/shots/)
//
// 为什么要有它:scripts/check-dist.mjs 只能看"产物文件在不在、head 全不全",
// 看不出"运行期是不是白屏 / 报错"。这一层用真浏览器兜住 —— CI 里跑(GitHub 的
// ubuntu runner 自带 Chrome);本机找不到 Chrome/Edge 时打印提示并跳过,不算失败。
//
// 实现走原生 CDP(和 design-preview/shoot.mjs 同一套做法,不引 puppeteer)。

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');
const SHOTS = join(ROOT, 'design-preview', 'shots');
const BASE = '/ViteBlog/';
const PORT_HTTP = 4321;
const PORT_CDP = 9334;
const WITH_SHOTS = process.argv.includes('--shots');

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/snap/bin/chromium',
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 托管 dist:和 vite preview 一样把 dist 挂在 base 前缀下,顺便做 SPA 兜底 */
function serveDist() {
  const server = createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
    const relative = url.startsWith(BASE) ? url.slice(BASE.length) : url.slice(1);
    let file = join(DIST, relative);
    if (!relative || existsSync(file) === false || statSync(file).isDirectory()) {
      file = join(file, 'index.html');
    }
    if (!existsSync(file)) file = join(DIST, 'index.html');
    try {
      res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
      res.end(readFileSync(file));
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  });
  return new Promise((resolve) => server.listen(PORT_HTTP, () => resolve(server)));
}

async function waitForCdp(timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT_CDP}/json/version`);
      if (res.ok) return await res.json();
    } catch {
      /* 还没起来 */
    }
    await sleep(300);
  }
  throw new Error('CDP 端口未就绪');
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  const events = [];
  const pending = new Map();
  let seq = 0;

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id !== undefined) {
      const entry = pending.get(msg.id);
      if (!entry) return;
      pending.delete(msg.id);
      if (msg.error) entry.reject(new Error(JSON.stringify(msg.error)));
      else entry.resolve(msg.result);
    } else {
      events.push(msg);
    }
  });

  const ready = new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  const send = (method, params = {}) => {
    const id = ++seq;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  };
  const waitEvent = (name, timeoutMs = 20000) =>
    new Promise((resolve, reject) => {
      const started = Date.now();
      const timer = setInterval(() => {
        const index = events.findIndex((e) => e.method === name);
        if (index >= 0) {
          clearInterval(timer);
          resolve(events.splice(index, 1)[0]);
        } else if (Date.now() - started > timeoutMs) {
          clearInterval(timer);
          reject(new Error(`等待 ${name} 超时`));
        }
      }, 30);
    });

  return { ws, ready, send, waitEvent, events };
}

// 图片清单:只有生成了 webp 变体的图才应该升级成 <picture>;
// 比最低档位(480)还窄的图本来就没有变体,断言时要把它们排除掉。
const manifest = (() => {
  try {
    return JSON.parse(
      readFileSync(join(ROOT, 'public', 'images', 'images.manifest.json'), 'utf8'),
    );
  } catch {
    return {};
  }
})();
const withVariants = Object.entries(manifest)
  .filter(([, entry]) => Array.isArray(entry.variants) && entry.variants.length > 0)
  .map(([key]) => key);

/** 每个页面要满足的断言(在页面里跑,返回 JSON 字符串) */
const PAGES = [
  {
    name: 'home',
    path: `${BASE}`,
    check: `JSON.stringify({
      cards: document.querySelectorAll('a[href*="/post/"]').length,
      text: document.body.innerText.length,
      footer: document.querySelectorAll('.footer-links a').length,
      title: document.title,
    })`,
    assert: (data) => [
      [data.cards >= 1, `首页至少有一篇文章链接(实际 ${data.cards})`],
      [data.text > 300, `首页有实际内容(正文 ${data.text} 字)`],
      [data.footer >= 3, `页脚订阅入口齐全(实际 ${data.footer})`],
      [data.title.length > 0, '页面标题非空'],
    ],
  },
  {
    name: 'post',
    path: `${BASE}post/hello-vite-blog`,
    check: `JSON.stringify({
      article: !!document.querySelector('.markdown-body'),
      headings: document.querySelectorAll('.markdown-body h2, .markdown-body h3').length,
      coverAlt: document.querySelector('.post-cover')?.getAttribute('alt') ?? null,
      share: document.querySelectorAll('.share-btn').length,
      text: document.body.innerText.length,
    })`,
    assert: (data) => [
      [data.article, '文章正文渲染出来了'],
      [data.headings >= 2, `文章有小标题(实际 ${data.headings})`],
      [!!data.coverAlt, '文章头图有 alt'],
      [data.share >= 4, `分享条四个按钮在(实际 ${data.share})`],
      [data.text > 500, `文章页有实际内容(正文 ${data.text} 字)`],
    ],
  },
  {
    name: 'post-images',
    path: `${BASE}post/how-to-build-a-blog-site/Hexo-GitHub-1`,
    check: `(() => {
      const expected = new Set(${JSON.stringify(withVariants)});
      const imgs = [...document.querySelectorAll('.markdown-body img')];
      const upgradeable = imgs.filter((img) => {
        const src = decodeURIComponent((img.getAttribute('src') ?? '').split(/[?#]/)[0]);
        return expected.has(src.replace(${JSON.stringify(BASE)}, '/'));
      });
      return JSON.stringify({
        images: imgs.length,
        upgradeable: upgradeable.length,
        upgraded: upgradeable.filter((img) => img.closest('picture')).length,
        currentSrc: document.querySelector('.markdown-body img')?.currentSrc ?? '',
      });
    })()`,
    assert: (data) => [
      [data.images >= 3, `正文图片渲染出来了(实际 ${data.images} 张)`],
      [data.upgradeable >= 3, `其中确实有带 webp 变体的图(实际 ${data.upgradeable} 张)`],
      [
        data.upgraded === data.upgradeable,
        `有变体的图都升级成了 <picture>(实际 ${data.upgraded}/${data.upgradeable})—— 回归过:中文路径没解码,清单查不到,webp 一直没生效`,
      ],
    ],
  },
  {
    // 搜索页:顺带端到端验一次索引(用只出现在正文里的词)与放大镜图标尺寸
    name: 'search',
    path: `${BASE}search?q=${encodeURIComponent('指数平滑异同')}`,
    check: `JSON.stringify({
      hits: document.querySelectorAll('.search-hit-mark').length,
      icon: (() => { const svg = document.querySelector('.search-box-icon svg'); return svg ? Math.round(svg.getBoundingClientRect().width) : 0; })(),
      value: document.querySelector('.search-input')?.value ?? '',
    })`,
    assert: (data) => [
      [data.value.length > 0, `搜索框带上了 ?q=(实际 "${data.value}")`],
      [data.hits > 0, `正文里的词能搜到命中(实际 ${data.hits} 处高亮)`],
      [data.icon >= 18, `放大镜图标够大(实际 ${data.icon}px;回归过:字体回退的 ⌕ 只有 9px)`],
    ],
  },
  {
    name: 'tags',
    path: `${BASE}tags`,
    check: `JSON.stringify({ links: document.querySelectorAll('a[href]').length, text: document.body.innerText.length, title: document.title })`,
    assert: (data) => [
      [data.links >= 10, `标签页有链接(实际 ${data.links})`],
      [data.text > 200, `标签页有内容(正文 ${data.text} 字)`],
    ],
  },
  {
    name: 'links',
    path: `${BASE}links`,
    check: `JSON.stringify({ text: document.body.innerText.length, title: document.title })`,
    assert: (data) => [
      [data.title.length > 0, '友链页标题非空'],
      [data.text > 60, `友链页有内容(正文 ${data.text} 字)`],
    ],
  },
];

const problems = [];

async function main() {
  if (!existsSync(DIST)) {
    console.error('缺少 dist(先 npm run build)');
    process.exit(1);
  }
  const chromePath = CHROME_PATHS.find((path) => existsSync(path));
  if (!chromePath) {
    console.log('跳过冒烟:本机没找到 Chrome / Edge(CI 的 ubuntu runner 自带 Chrome)');
    return;
  }

  if (WITH_SHOTS) mkdirSync(SHOTS, { recursive: true });
  const server = await serveDist();
  const chrome = spawn(
    chromePath,
    [
      '--headless=new',
      `--remote-debugging-port=${PORT_CDP}`,
      `--user-data-dir=${join(ROOT, 'node_modules', '.cache', 'smoke-profile')}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--hide-scrollbars',
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  try {
    await waitForCdp();
    for (const page of PAGES) {
      const target = await (
        await fetch(`http://127.0.0.1:${PORT_CDP}/json/new?about:blank`, { method: 'PUT' })
      ).json();
      const client = connect(target.webSocketDebuggerUrl);
      await client.ready;
      const { send, waitEvent, events } = client;
      await send('Page.enable');
      await send('Runtime.enable');
      await send('Log.enable');
      await send('Emulation.setDeviceMetricsOverride', {
        width: 1280,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false,
      });

      events.length = 0;
      await send('Page.navigate', { url: `http://127.0.0.1:${PORT_HTTP}${page.path}` });
      await waitEvent('Page.loadEventFired').catch(() => {});
      await sleep(1200); // 等 React 渲染完 + 异步块(字体/搜索索引)到位
      await send('Runtime.evaluate', {
        expression: 'document.fonts.ready.then(() => 1)',
        awaitPromise: true,
      });

      const errors = events
        .filter(
          (event) =>
            (event.method === 'Runtime.consoleAPICalled' && event.params?.type === 'error') ||
            event.method === 'Runtime.exceptionThrown' ||
            (event.method === 'Log.entryAdded' && event.params?.entry?.level === 'error'),
        )
        .map((event) =>
          event.method === 'Runtime.exceptionThrown'
            ? `exception: ${event.params.exceptionDetails?.text}`
            : event.method === 'Log.entryAdded'
              ? `log: ${event.params.entry.text}`
              : `console.error: ${(event.params.args ?? []).map((a) => a.value ?? a.description ?? '').join(' ')}`,
        );
      for (const message of errors) problems.push(`${page.name}: 控制台报错 —— ${message}`);

      const result = await send('Runtime.evaluate', {
        expression: page.check,
        returnByValue: true,
      });
      const data = JSON.parse(result.result.value);
      const rows = page.assert(data);
      for (const [ok, label] of rows) {
        if (ok) console.log(`   ✓ ${page.name}: ${label}`);
        else {
          problems.push(`${page.name}: ${label}`);
          console.log(`   ✗ ${page.name}: ${label}`);
        }
      }

      if (WITH_SHOTS) {
        const size = await send('Runtime.evaluate', {
          expression: 'document.documentElement.scrollHeight',
          returnByValue: true,
        });
        const shot = await send('Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: true,
          clip: { x: 0, y: 0, width: 1280, height: Math.min(size.result.value, 6000), scale: 1 },
        });
        writeFileSync(join(SHOTS, `smoke-${page.name}.png`), Buffer.from(shot.data, 'base64'));
      }

      client.ws.close();
      await fetch(`http://127.0.0.1:${PORT_CDP}/json/close/${target.id}`);
    }
  } finally {
    chrome.kill();
    server.close();
  }

  console.log(problems.length === 0 ? '\n冒烟通过 ✅' : `\n冒烟失败 ${problems.length} 项 ❌`);
  process.exitCode = problems.length === 0 ? 0 : 1;
}

await main();
