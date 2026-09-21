// 给 README 生成十套主题的预览图(每套一张首屏截图 → docs/themes/<theme>.webp)。
//
//   node design-preview/build-all.mjs       # 先逐主题构建到 design-preview/out/
//   node design-preview/serve-dist.mjs      # 再起预览服务器(4191-4200)
//   node design-preview/readme-shots.mjs    # 最后跑这个,产出 docs/themes/*.webp
//
// 主题样式改动后重跑这三步,README 里的预览图就跟着更新。
// 截图尺寸固定 1280×900(首屏),转成 webp 压到几十 KB,免得仓库里躺十张几 MB 的 PNG。

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT_DIR = join(ROOT, 'docs', 'themes');
const PROFILE = join(ROOT, 'node_modules', '.cache', 'readme-shot-profile');
const PORT_CDP = 9336;
const WIDTH = 1280;
const HEIGHT = 900;
const QUALITY = 82;

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

/** 与 design-preview/serve-dist.mjs 的端口表保持一致 */
const THEMES = [
  ['pixel', 4191],
  ['swiss', 4192],
  ['editorial', 4193],
  ['brutalist', 4194],
  ['bento', 4195],
  ['terminal', 4196],
  ['glass', 4197],
  ['ma', 4198],
  ['blueprint', 4199],
  ['noir', 4200],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForCdp(timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT_CDP}/json/version`);
      if (res.ok) return;
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

const chromePath = CHROME_PATHS.find((path) => existsSync(path));
if (!chromePath) {
  console.error('找不到 Chrome / Edge,无法截图');
  process.exit(1);
}
mkdirSync(OUT_DIR, { recursive: true });

const chrome = spawn(
  chromePath,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT_CDP}`,
    `--user-data-dir=${PROFILE}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--hide-scrollbars',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

const rows = [];
try {
  await waitForCdp();
  for (const [theme, port] of THEMES) {
    const target = await (
      await fetch(`http://127.0.0.1:${PORT_CDP}/json/new?about:blank`, {
        method: 'PUT',
      })
    ).json();
    const client = connect(target.webSocketDebuggerUrl);
    await client.ready;
    const { send, waitEvent } = client;
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: WIDTH,
      height: HEIGHT,
      deviceScaleFactor: 1,
      mobile: false,
    });

    // 统一按浅色模式截(noir 本来就是暗底,不受影响)
    await send('Runtime.evaluate', {
      expression: "localStorage.setItem('theme','light')",
    });
    await send('Page.navigate', { url: `http://127.0.0.1:${port}/ViteBlog/` });
    await waitEvent('Page.loadEventFired').catch(() => {});
    await send('Runtime.evaluate', {
      expression: 'document.fonts.ready.then(() => 1)',
      awaitPromise: true,
    });
    await sleep(700); // 等首页卡片与封面图渲染

    // 预览图里藏掉固定层(音乐挂件 / 回顶按钮 / 滚动进度条):它们压住内容,
    // 缩成 README 缩略图后只剩干扰,主题本身才是重点
    await send('Runtime.evaluate', {
      expression: `(() => {
        const style = document.createElement('style');
        style.textContent = '.music-dock,.back-top,.reading-progress{display:none!important}';
        document.head.append(style);
      })()`,
    });
    await sleep(250);

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const png = Buffer.from(shot.data, 'base64');
    const file = join(OUT_DIR, `${theme}.webp`);
    const info = await sharp(png).webp({ quality: QUALITY }).toFile(file);
    rows.push(`${theme.padEnd(10)} ${info.width}×${info.height}  ${(info.size / 1024).toFixed(0)} KB`);
    console.log(`   ✓ ${rows.at(-1)}`);

    client.ws.close();
    await fetch(`http://127.0.0.1:${PORT_CDP}/json/close/${target.id}`);
  }
} finally {
  chrome.kill();
}

console.log(`\n共 ${rows.length} 张预览图 → docs/themes/`);
