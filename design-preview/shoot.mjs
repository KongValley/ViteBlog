// 四套主题的"真站点"全页截图 + 控制台报错采集
// 用法:node design-preview/shoot.mjs  (需先启动 design-preview/serve-dist.mjs)
// 原理:拉起无头 Chrome,通过 CDP 打开页面 → 等字体加载完 → 全页截图,
//      同时收集 console error / 未捕获异常,任何一条都算验证失败。

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SHOTS = join(ROOT, 'design-preview', 'shots');
const PROFILE = join(ROOT, 'node_modules', '.cache', 'mcode-shot-profile');
const PORT = 9333;
const WIDTH = 1440;

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

// 主题 → 预览端口;页面 → URL 后缀
const THEMES = [
  ['brutalist', 4191],
  ['bento', 4192],
  ['terminal', 4193],
  ['glass', 4194],
];
const PAGES = [
  ['home', '/ViteBlog/'],
  ['post', '/ViteBlog/post/hello-vite-blog'],
  ['tags', '/ViteBlog/tags'],
  ['about', '/ViteBlog/about'],
];
const MODES = ['light', 'dark'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForCdp(timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return await res.json();
    } catch {
      /* 还没起来,继续等 */
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

  // 从事件流里捞一条指定事件(捞过就移除,避免重复命中)
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

const problems = [];
const notes = [];
const report = [];

async function main() {
  const chromePath = CHROME_PATHS.find((p) => existsSync(p));
  if (!chromePath) throw new Error('找不到 Chrome / Edge 可执行文件');
  mkdirSync(SHOTS, { recursive: true });

  const chrome = spawn(
    chromePath,
    [
      '--headless=new',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${PROFILE}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  try {
    await waitForCdp();

    for (const [theme, port] of THEMES) {
      const target = await (
        await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, {
          method: 'PUT',
        })
      ).json();
      const client = connect(target.webSocketDebuggerUrl);
      await client.ready;
      const { send, waitEvent, events } = client;

      await send('Page.enable');
      await send('Runtime.enable');
      await send('Log.enable');
      await send('Emulation.setDeviceMetricsOverride', {
        width: WIDTH,
        height: 1000,
        deviceScaleFactor: 1,
        mobile: false,
      });

      for (const [page, path] of PAGES) {
        for (const mode of MODES) {
          events.length = 0;
          await send('Page.navigate', { url: `http://localhost:${port}${path}` });
          await waitEvent('Page.loadEventFired').catch(() => {});
          // 首屏主题由 localStorage 决定,载入后按目标模式重新校准一次
          await send('Runtime.evaluate', {
            expression: `localStorage.setItem('theme','${mode}')`,
          });
          await send('Page.reload');
          await waitEvent('Page.loadEventFired').catch(() => {});
          // 等 React 渲染 + 异步字体块到位
          await send('Runtime.evaluate', {
            expression: 'document.fonts.ready.then(() => 1)',
            awaitPromise: true,
          });
          await sleep(400);

          const collected = events.filter(
            (e) =>
              (e.method === 'Runtime.consoleAPICalled' &&
                e.params?.type === 'error') ||
              e.method === 'Runtime.exceptionThrown' ||
              (e.method === 'Log.entryAdded' &&
                ['error', 'warning'].includes(e.params?.entry?.level)),
          );
          const describe = (e) => {
            if (e.method === 'Log.entryAdded') {
              return `${e.params.entry.level}: ${e.params.entry.text}`;
            }
            if (e.method === 'Runtime.exceptionThrown') {
              return `exception: ${e.params.exceptionDetails?.text}`;
            }
            return `console.error: ${(e.params.args ?? [])
              .map((a) => a.value ?? a.description ?? '')
              .join(' ')}`;
          };
          const errors = collected
            .filter(
              (e) =>
                e.method !== 'Log.entryAdded' ||
                e.params.entry.level === 'error',
            )
            .map(describe);
          const warnings = collected
            .filter(
              (e) =>
                e.method === 'Log.entryAdded' &&
                e.params.entry.level === 'warning',
            )
            .map(describe);

          const dims = await send('Runtime.evaluate', {
            expression:
              'JSON.stringify({h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth, theme: document.documentElement.dataset.theme})',
            returnByValue: true,
          });
          const info = JSON.parse(dims.result.value);

          const shot = await send('Page.captureScreenshot', {
            format: 'png',
            captureBeyondViewport: true,
            clip: {
              x: 0,
              y: 0,
              width: WIDTH,
              height: info.h,
              scale: 1,
            },
          });
          const name = `${theme}-${page}-${mode}.png`;
          writeFileSync(join(SHOTS, name), Buffer.from(shot.data, 'base64'));

          report.push(
            `${theme.padEnd(10)} ${page.padEnd(6)} ${mode.padEnd(5)} ${String(info.w).padStart(5)}×${String(info.h).padStart(5)}  theme=${info.theme}  ${name}`,
          );
          if (errors.length > 0) {
            problems.push(`${theme}/${page}/${mode}: ${errors.join(' | ')}`);
          }
          if (warnings.length > 0) {
            notes.push(`${theme}/${page}/${mode}: ${warnings.join(' | ')}`);
          }
        }
      }

      client.ws.close();
      await fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`);
    }
  } finally {
    chrome.kill();
  }

  console.log('--- 截图完成 ---');
  for (const line of report) console.log(line);
  console.log('\n--- 控制台检查 ---');
  console.log(
    problems.length === 0
      ? '四套主题 × 四个页面 × 明暗两模式:控制台无 error / 无未捕获异常 ✅'
      : problems.join('\n'),
  );
  if (notes.length > 0) {
    console.log('\n--- 浏览器 warning(仅供参考)---');
    console.log(notes.join('\n'));
  }
  if (problems.length > 0) process.exitCode = 1;
}

await main();
