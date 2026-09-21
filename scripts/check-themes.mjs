// 主题契约自检:共享组件依赖的那些「通用变量别名」,十套主题必须给齐。
//
//   node scripts/check-themes.mjs
//
// 为什么需要它:共享组件(src/components/*.css、src/App.css)里的配色一律写成
// `var(--red, 兜底)` 这种带兜底的形式 —— 主题漏定义某个变量不会报错,只会静默降级成兜底色。
// 这套「通用变量别名」目前是每套主题各抄一份(见各主题 style.css 末尾),抄漏了没人知道。
// 这里把它变成可执行的检查:哪些变量大多数主题都定义了,就要求剩下的主题也定义。
//
// 检查项:
//   1. 每套主题有 style.css / index.ts;
//   2. 多数主题都定义的通用变量,这一套也得有(阈值:≥ 6/10);
//   3. 每套主题有 @media (prefers-reduced-motion: reduce) 兜底(曾经只有 pixel 缺);
//   4. 共享组件里有没有"没有兜底"的主题变量引用(注释里的示例不算)。

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const THEMES_DIR = join(ROOT, 'src', 'themes');
/** 多数主题定义的变量才纳入契约 —— 少数派(如 --shadow)本来就只有部分主题需要 */
const MAJORITY = 6;

/** 主题自己组件用的私有变量(组件自己通过内联样式注入),不参与契约 */
const PRIVATE_PREFIX = /^--(eg|nf|stats|music)-/;

const themes = readdirSync(THEMES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

const defined = new Map();
for (const theme of themes) {
  const css = strip(readFileSync(join(THEMES_DIR, theme, 'style.css'), 'utf8'));
  defined.set(
    theme,
    new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1])),
  );
}

// 统计每个变量被多少套主题定义,取多数派作为契约
const counts = new Map();
for (const set of defined.values()) {
  for (const name of set) {
    if (PRIVATE_PREFIX.test(name)) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
}
const contract = [...counts.entries()]
  .filter(([, count]) => count >= MAJORITY)
  .map(([name]) => name)
  .sort();

console.log(
  `契约变量 ${contract.length} 个(≥${MAJORITY}/${themes.length} 套主题定义):${contract.join(' ')}\n`,
);

const failures = [];
for (const theme of themes) {
  const set = defined.get(theme);
  const problems = [];

  for (const name of contract) {
    if (!set.has(name)) problems.push(`未定义 ${name}`);
  }
  const css = strip(readFileSync(join(THEMES_DIR, theme, 'style.css'), 'utf8'));
  if (!/@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)/.test(css)) {
    problems.push('缺少 prefers-reduced-motion 兜底');
  }
  try {
    readFileSync(join(THEMES_DIR, theme, 'index.ts'), 'utf8');
  } catch {
    problems.push('缺少 index.ts(主题入口)');
  }

  if (problems.length > 0) {
    failures.push(`${theme}: ${problems.join('、')}`);
    console.log(`   ✗ ${theme}: ${problems.join('、')}`);
  } else {
    console.log(`   ✓ ${theme}`);
  }
}

// 共享组件里"没有兜底"的主题变量引用:漏定义时整条声明直接失效,值得盯一眼
const noFallback = [];
for (const name of readdirSync(join(ROOT, 'src', 'components'))) {
  if (!name.endsWith('.css')) continue;
  const file = join(ROOT, 'src', 'components', name);
  const text = strip(readFileSync(file, 'utf8'));
  for (const match of text.matchAll(/var\(\s*(--[a-z0-9-]+)\s*\)/g)) {
    if (!PRIVATE_PREFIX.test(match[1])) noFallback.push(`${name}: ${match[1]}`);
  }
}
for (const item of new Set(noFallback)) {
  console.log(`提示:共享组件里没有兜底的引用 —— ${item}`);
}

console.log(
  failures.length === 0
    ? `\n主题契约自检通过:${themes.length} 套主题都满足契约 ✅`
    : `\n主题契约自检失败 ${failures.length} 项 ❌`,
);
process.exit(failures.length === 0 ? 0 : 1);
