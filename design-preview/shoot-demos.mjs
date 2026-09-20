// 给 design-preview 里的选型 Demo 批量截图 + 采集控制台报错
// 用法:
//   1) node design-preview/serve.mjs        # 另开一个终端,提供 http://localhost:4180
//   2) node design-preview/shoot-demos.mjs  # 本脚本
// 产物:design-preview/shots/demos/<编号>-<名字>.png(全页)

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SHOTS = join(ROOT, 'design-preview', 'shots', 'demos');
const PROFILE = join(ROOT, 'node_modules', '.cache', 'mcode-shot-profile');
const PORT = 9333;
const WIDTH = 1440;
const BASE = 'http://localhost:4180/design-preview/';

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

// 需要截图的 Demo(文件名即 URL)
const PAGES = [
  '11-liquid-chrome.html',
  '12-ma-minimal.html',
  '13-blueprint.html',
  '14-museum.html',
  '15-orbital.html',
  '16-noir.html',
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

const problems = [];

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
      width: WIDTH,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });

    for (const page of PAGES) {
      events.length = 0;
      await send('Page.navigate', { url: BASE + page });
      await waitEvent('Page.loadEventFired').catch(() => {});
      await send('Runtime.evaluate', {
        expression: 'document.fonts.ready.then(() => 1)',
        awaitPromise: true,
      });
      await sleep(700);

      const dims = await send('Runtime.evaluate', {
        expression:
          'JSON.stringify({h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth, bodyW: document.body.scrollWidth, ox: getComputedStyle(document.body).overflowX})',
        returnByValue: true,
      });
      const info = JSON.parse(dims.result.value);

      // 横向溢出诊断:找出超出视口右边界的元素(装饰性溢出也一并列出)
      const overflow = await send('Runtime.evaluate', {
        expression: `JSON.stringify([...document.querySelectorAll('body *')]
          .map(el => ({ el, r: el.getBoundingClientRect() }))
          .filter(({ r }) => r.width > 0 && (r.right > innerWidth + 1 || r.left < -1))
          .slice(0, 4)
          .map(({ el, r }) => el.tagName.toLowerCase() + '.' + String(el.className || '').split(' ')[0] + ' right=' + Math.round(r.right)))`,
        returnByValue: true,
      });
      const spills = JSON.parse(overflow.result.value);

      const shot = await send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
        clip: { x: 0, y: 0, width: WIDTH, height: info.h, scale: 1 },
      });
      writeFileSync(join(SHOTS, page.replace('.html', '.png')), Buffer.from(shot.data, 'base64'));

      const rawErrors = events
        .filter(
          (e) =>
            (e.method === 'Runtime.consoleAPICalled' &&
              e.params?.type === 'error') ||
            e.method === 'Runtime.exceptionThrown' ||
            (e.method === 'Log.entryAdded' && e.params?.entry?.level === 'error'),
        )
        .map((e) => {
          if (e.method === 'Log.entryAdded') {
            const entry = e.params.entry ?? {};
            const path = entry.url ? entry.url.replace(/^https?:\/\/[^/]+/, '') : '';
            return `${path}${path ? ' → ' : ''}${entry.text}`;
          }
          if (e.method === 'Runtime.exceptionThrown') {
            return `exception: ${e.params.exceptionDetails?.text}`;
          }
          return `console.error: ${(e.params.args ?? []).map((a) => a.value ?? a.description ?? '').join(' ')}`;
        });
      // 浏览器对 /favicon.ico 的默认请求会 404,与本 demo 无关,不计入问题
      const errors = rawErrors.filter((t) => !/favicon\.ico/.test(t));
      const extra =
        info.w > WIDTH
          ? `  ⤷ 文档宽 ${info.w}(body ${info.bodyW} / overflow-x:${info.ox})`
          : '';
      // 真的能横向滚动吗?滚一下再读 scrollX 就知道(文档宽多出几像素未必等于缺陷)
      const scrollTest = await send('Runtime.evaluate', {
        expression:
          '(() => { window.scrollTo(200, 0); const x = window.scrollX; window.scrollTo(0, 0); return x; })()',
        returnByValue: true,
      });
      const canScrollX = scrollTest.result.value > 0;
      if (canScrollX) problems.push(`${page}: 真的可以横向滚动(${scrollTest.result.value}px)`);
      const scrollNote = canScrollX
        ? '  ⤷ ⚠ 可横向滚动'
        : info.w > WIDTH
          ? '  ⤷ 仅测量残差,不可横向滚动'
          : '';
      console.log(
        `${page.padEnd(24)} ${String(info.w).padStart(5)}×${String(info.h).padStart(5)}  ${errors.length ? 'ERR: ' + errors.join(' | ') : 'console clean'}${spills.length ? '  ⤷ 横向溢出元素: ' + spills.join(' , ') : ''}${extra}${scrollNote}`,
      );
      if (errors.length > 0) problems.push(`${page}: ${errors.join(' | ')}`);
    }

    client.ws.close();
    await fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`);
  } finally {
    chrome.kill();
  }

  console.log(problems.length === 0 ? '\n六套 Demo 控制台均无报错 ✅' : `\n失败:${problems.join('\n')}`);
  if (problems.length > 0) process.exitCode = 1;
}

await main();
