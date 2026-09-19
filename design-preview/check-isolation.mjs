// 主题隔离自检:确认每套主题的构建产物"只含自己"
// 用法:node design-preview/check-isolation.mjs
//   · 读 design-preview/out/<theme>/(由构建脚本产出的各主题 dist)
//   · 读 dist/(当前 site.yml 选中的主题,即线上默认主题)
// 检查项:自身样式标记存在、其他主题标记不出现、
//         中文字体块单独成文件且不进首屏阻塞加载

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

// 每套主题的"指纹"选择器 + 变量前缀
const FINGERPRINTS = {
  brutalist: ['.br-post', '--br-'],
  bento: ['.be-kicker', '--be-'],
  terminal: ['.tm-log-row', '--tm-'],
  glass: ['.gl-card', '--gl-'],
  swiss: ['.sw-marquee', '--sw-'],
  editorial: ['.ed-row', '--ed-'],
};

function readDirAssets(dir) {
  const assets = join(dir, 'assets');
  if (!existsSync(assets)) return null;
  const files = readdirSync(assets);
  const css = files
    .filter((f) => f.startsWith('index-') && f.endsWith('.css'))
    .map((f) => readFileSync(join(assets, f), 'utf8'))
    .join('\n');
  return {
    dir,
    files,
    css,
    fontsChunk: files.find((f) => f.startsWith('fonts-') && f.endsWith('.css')),
    html: existsSync(join(dir, 'index.html'))
      ? readFileSync(join(dir, 'index.html'), 'utf8')
      : '',
    mainJs: files.find((f) => f.endsWith('.js')),
  };
}

let failed = 0;
const check = (ok, label) => {
  if (!ok) failed += 1;
  console.log(`   ${ok ? '✓' : '✗'} ${label}`);
};

// ---- 1. 四套新主题的独立构建 ----
for (const theme of ['brutalist', 'bento', 'terminal', 'glass']) {
  const dir = join(ROOT, 'design-preview', 'out', theme);
  const info = readDirAssets(dir);
  console.log(`\n[${theme}]`);
  if (!info) {
    console.log('   ✗ 缺少构建产物(先构建该主题并拷入 design-preview/out/)');
    failed += 1;
    continue;
  }

  const [ownClass, ownVar] = FINGERPRINTS[theme];
  check(info.css.includes(ownClass), `自身标记 ${ownClass} 存在于样式`);
  check(info.css.includes(ownVar), `自身变量前缀 ${ownVar} 存在`);

  for (const other of Object.keys(FINGERPRINTS)) {
    if (other === theme) continue;
    const [cls, varPrefix] = FINGERPRINTS[other];
    const leaked = info.css.includes(cls) || info.css.includes(varPrefix);
    check(!leaked, `未混入「${other}」的样式`);
  }

  check(Boolean(info.fontsChunk), '中文字体单独成块(fonts-*.css)');
  check(!info.html.includes('fonts-'), '字体块不进首屏阻塞加载(html 无 fonts 引用)');

  const js = info.mainJs
    ? readFileSync(join(dir, 'assets', info.mainJs), 'utf8')
    : '';
  check(
    Boolean(info.fontsChunk) && js.includes(info.fontsChunk),
    '主 JS 会异步拉取字体块',
  );
}

// ---- 2. 当前 dist(默认主题)不混入任何新主题 ----
const dist = readDirAssets(join(ROOT, 'dist'));
console.log('\n[dist 当前构建]');
if (!dist) {
  console.log('   ✗ 缺少 dist(先 npm run build)');
  failed += 1;
} else {
  for (const theme of ['brutalist', 'bento', 'terminal', 'glass']) {
    const [cls, varPrefix] = FINGERPRINTS[theme];
    const leaked = dist.css.includes(cls) || dist.css.includes(varPrefix);
    check(!leaked, `未混入「${theme}」的样式`);
  }
}

console.log(failed === 0 ? '\n全部通过 ✅' : `\n失败 ${failed} 项 ❌`);
process.exit(failed === 0 ? 0 : 1);
