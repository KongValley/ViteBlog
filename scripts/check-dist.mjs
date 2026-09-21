// 构建产物自检:构建脚本改坏了,这里先叫出来,别等线上才发现。
//
//   node scripts/check-dist.mjs        (需要先 npm run build)
//
// 检查的都是"加了新东西容易漏"的点:
//   1. 每个 HTML 都有 title / canonical / og:image / twitter:card / JSON-LD / 订阅发现;
//   2. HTML 里引用的本地资源(js/css/图片)在 dist 里真的存在;
//   3. feed/atom/feed.json/sitemap/robots/404.html/apple-touch-icon 这些产物齐全;
//   4. 预渲染文章数与 src/posts 下的 .md 数量一致,封面与分享图也都齐;
//   5. CSS 里 url() 引用的资源存在(自动化清理旧格式字体后,别把还在用的文件删了)。

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');
const BASE = '/ViteBlog/';

if (!existsSync(DIST)) {
  console.error('缺少 dist(先 npm run build)');
  process.exit(1);
}

let problems = 0;
const fail = (message) => {
  problems += 1;
  console.log(`   ✗ ${message}`);
};

const walk = (dir, filter) => {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, filter));
    else if (filter(full)) out.push(full);
  }
  return out;
};

// ---- 1 & 2. HTML:必需的 head 标签 + 本地资源存在 ----
const htmlFiles = walk(DIST, (file) => file.endsWith('.html'));
console.log(`HTML 文件 ${htmlFiles.length} 个`);

const missingAssets = new Set();
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const name = relative(DIST, file);
  // 404.html 是 SPA 兜底(内容就是首页),同样按首页要求检查
  for (const [label, pattern] of [
    ['title', /<title>[^<]+<\/title>/],
    ['canonical', /rel="canonical" href="http/],
    ['og:image', /property="og:image"/],
    ['twitter:card', /name="twitter:card"/],
    ['JSON-LD', /application\/ld\+json/],
    ['订阅发现', /rel="alternate"[^>]*application\/rss\+xml/],
  ]) {
    if (!pattern.test(html)) fail(`${name} 缺 ${label}`);
  }

  const jsonLd = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  );
  if (jsonLd) {
    try {
      JSON.parse(jsonLd[1].replaceAll('\\u003c', '<'));
    } catch {
      fail(`${name} 的 JSON-LD 不是合法 JSON`);
    }
  }

  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const url = match[1];
    if (!url.startsWith(BASE) || url === BASE) continue;
    const local = join(DIST, url.slice(BASE.length).split('?')[0]);
    if (!existsSync(local)) missingAssets.add(`${name} → ${url}`);
  }
}
for (const item of missingAssets) fail(`引用的本地资源不存在:${item}`);

// ---- 3. 顶层产物 ----
for (const file of [
  'index.html',
  '404.html',
  'feed.xml',
  'atom.xml',
  'feed.json',
  'sitemap.xml',
  'robots.txt',
  'apple-touch-icon.png',
]) {
  if (!existsSync(join(DIST, file))) fail(`缺少 ${file}`);
}

// ---- 4. 预渲染与图片数量 ----
const countFiles = (dir, suffix) => {
  if (!existsSync(dir)) return 0;
  return walk(dir, (file) => file.endsWith(suffix)).length;
};
const posts = walk(join(ROOT, 'src', 'posts'), (file) =>
  file.endsWith('.md'),
).length;
const prerendered = countFiles(join(DIST, 'post'), '.html');
if (prerendered !== posts) {
  fail(`预渲染文章 ${prerendered} 篇,与 src/posts 下的 ${posts} 篇不一致`);
}
for (const [label, dir] of [
  ['自动封面', join(ROOT, 'public', 'covers')],
  ['分享图', join(DIST, 'og')],
]) {
  const count = countFiles(dir, '.png');
  if (count !== posts) fail(`${label} ${count} 张,与 ${posts} 篇文章不一致`);
}

// ---- 5. CSS 里 url() 引用的资源 ----
for (const cssFile of walk(join(DIST, 'assets'), (file) =>
  file.endsWith('.css'),
)) {
  const css = readFileSync(cssFile, 'utf8');
  for (const match of css.matchAll(/url\((['"]?)([^'")]+)\1\)/g)) {
    const url = match[2];
    if (url.startsWith('data:') || url.startsWith('http')) continue;
    // 旧格式字体是被 prune-assets 有意删掉的(wOFF/ttf 在 @font-face 里只是兜底)
    if (/\.(woff|ttf|otf|eot)$/i.test(url)) continue;
    const target = url.startsWith('/')
      ? join(DIST, url.startsWith(BASE) ? url.slice(BASE.length) : url.slice(1))
      : join(dirname(cssFile), url);
    if (!existsSync(target)) {
      fail(`${relative(DIST, cssFile)} 里 url(${url}) 指向的文件不存在`);
    }
  }
}

// ---- 汇总 ----
const distSize = walk(DIST, () => true).reduce(
  (sum, file) => sum + statSync(file).size,
  0,
);
console.log(
  `\ndist 体积 ${(distSize / 1024 / 1024).toFixed(1)} MB(文章 ${prerendered} 篇 / 封面 ${countFiles(join(ROOT, 'public', 'covers'), '.png')} 张)`,
);
console.log(
  problems === 0 ? '构建产物自检通过 ✅' : `构建产物自检失败 ${problems} 项 ❌`,
);
process.exit(problems === 0 ? 0 : 1);
