// 给任意 URL 拍一张全页截图(用于核对线上站点)
// 用法:node design-preview/shoot-url.mjs <url> [输出文件名] [宽度]
// 例:  node design-preview/shoot-url.mjs https://kongvalley.github.io/ViteBlog/ live-home.png

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SHOTS = join(ROOT, 'design-preview', 'shots');
const PROFILE = join(ROOT, 'node_modules', '.cache', 'mcode-shot-profile');
const PORT = 9333;

const url = process.argv[2];
const outName = process.argv[3] ?? 'live.png';
const width = Number(process.argv[4] ?? 1440);
if (!url) {
  console.error('用法:node design-preview/shoot-url.mjs <url> [输出文件名] [宽度]');
  process.exit(1);
}

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForCdp(timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return await res.json();
    } catch {
      /* 等 Chrome 起来 */
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
    return new Promise((resolve, reject) =>
      pending.set(id, { resolve, reject }),
    );
  };
  const waitEvent = (name, timeoutMs = 30000) =>
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

async function main() {
  const chromePath = CHROME_PATHS.find((p) => existsSync(p));
  if (!chromePath) throw new Error('找不到 Chrome / Edge');
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
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await send('Page.navigate', { url });
    await waitEvent('Page.loadEventFired').catch(() => {});
    await send('Runtime.evaluate', {
      expression: 'document.fonts.ready.then(() => 1)',
      awaitPromise: true,
    });
    await sleep(900);

    const dims = await send('Runtime.evaluate', {
      expression:
        'JSON.stringify({h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth, css: [...document.styleSheets].map(s => s.href).filter(Boolean).join(" ")})',
      returnByValue: true,
    });
    const info = JSON.parse(dims.result.value);

    const shot = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width, height: info.h, scale: 1 },
    });
    writeFileSync(join(SHOTS, outName), Buffer.from(shot.data, 'base64'));

    const errors = events
      .filter(
        (e) =>
          e.method === 'Runtime.exceptionThrown' ||
          (e.method === 'Runtime.consoleAPICalled' && e.params?.type === 'error'),
      )
      .map(
        (e) =>
          e.params?.exceptionDetails?.text ??
          (e.params?.args ?? []).map((a) => a.value ?? '').join(' '),
      );

    console.log(`已保存 design-preview/shots/${outName}`);
    console.log(`页面尺寸 ${info.w}×${info.h}`);
    console.log(`样式表:${info.css.split(' ').map((u) => u.replace(/^https?:\/\/[^/]+/, '')).join('\n         ')}`);
    console.log(
      errors.length ? `控制台:${errors.join(' | ')}` : '控制台:无报错',
    );

    client.ws.close();
    await fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`);
  } finally {
    chrome.kill();
  }
}

await main();
