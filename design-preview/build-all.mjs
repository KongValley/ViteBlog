// 逐主题构建:把十套主题各构建一遍,产物拷进 design-preview/out/<theme>/
// 供 serve-dist.mjs 按线上子路径 /ViteBlog/ 提供,再用 shoot.mjs 截图验证
// 用法:node design-preview/build-all.mjs [主题名…]
//
// 注意:构建期间会临时改写 site.yml 的 theme 字段,结束时按原文恢复(逐字节)

import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SITE_YML = join(ROOT, 'site.yml');
const DIST = join(ROOT, 'dist');
const OUT = join(ROOT, 'design-preview', 'out');

const ALL_THEMES = [
  'pixel',
  'swiss',
  'editorial',
  'brutalist',
  'bento',
  'terminal',
  'glass',
  'ma',
  'blueprint',
  'noir',
];

const wanted = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const themes = wanted.length
  ? ALL_THEMES.filter((t) => wanted.includes(t))
  : ALL_THEMES;

const original = readFileSync(SITE_YML, 'utf8');
const failed = [];

const setTheme = (theme) => {
  const current = readFileSync(SITE_YML, 'utf8');
  if (!/^theme:.*$/m.test(current)) throw new Error('site.yml 里没找到 theme 字段');
  const next = current.replace(/^theme:.*$/m, `theme: ${theme}`);
  if (next !== current) writeFileSync(SITE_YML, next, 'utf8');
};

try {
  for (const theme of themes) {
    setTheme(theme);
    const build = spawnSync('npm run build', {
      cwd: ROOT,
      shell: true,
      encoding: 'utf8',
    });

    if (build.status !== 0) {
      failed.push(theme);
      const tail = (build.stdout ?? '')
        .split('\n')
        .filter(Boolean)
        .slice(-6)
        .join('\n');
      console.log(`✗ ${theme.padEnd(10)} 构建失败\n${tail}`);
      continue;
    }

    const target = join(OUT, theme);
    rmSync(target, { recursive: true, force: true });
    cpSync(DIST, target, { recursive: true });
    console.log(`✓ ${theme.padEnd(10)} 构建完成 → design-preview/out/${theme}/`);
  }
} finally {
  writeFileSync(SITE_YML, original, 'utf8');
  console.log(
    `\nsite.yml 已恢复为:${original.match(/^theme:(.*)$/m)?.[1].trim()}`,
  );
}

if (!existsSync(OUT)) {
  console.log('没有产出任何主题产物');
}

console.log(
  failed.length ? `失败主题:${failed.join(' / ')}` : '全部主题构建通过 ✅',
);
if (failed.length) process.exitCode = 1;