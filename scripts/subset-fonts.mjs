// 中文字体子集化:把 pixel 主题那份全量中西文像素字体裁成「站里真正用到的字」。
//
//   node scripts/subset-fonts.mjs [--force]   → src/themes/pixel/fonts/fusion-pixel-subset.woff2
//
// 为什么:主题正文用的 @fontsource/fusion-pixel-12px-proportional-sc 是整站最大的一坨
//   —— woff2 588 KB(包里还配了一份 1438 KB 的 woff 老格式),首屏就得下,而 51 篇文章
//   里真正出现的汉字撑死一千多个。构建期用 harfbuzz(subset-font)按字符集裁一遍,落到几十 KB。
//
// 字符集 = 文章与硬编码文案里出现的全部字符 + ASCII 可打印区 + 常用中文标点。
//   宁可多带一点也不能漏:漏一个字在页面上就是一个豆腐块。来源都在下面 TRACKED 里,
//   它们没改过就不重新裁(输出比输入新即跳过,除非 --force),挂在 predev/prebuild 上不拖慢启动。

import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
/** 全量源字体:裁 latin-400-normal 那份 woff2(woff 是同一批字形的老格式,不用管) */
const SOURCE_FONT = join(
  ROOT,
  'node_modules',
  '@fontsource',
  'fusion-pixel-12px-proportional-sc',
  'files',
  'fusion-pixel-12px-proportional-sc-latin-400-normal.woff2',
);
const OUT_DIR = join(ROOT, 'src', 'themes', 'pixel', 'fonts');
const OUT_FONT = join(OUT_DIR, 'fusion-pixel-subset.woff2');
const FORCE = process.argv.includes('--force');

// 字符来源:文章的 md(frontmatter 也在里面)、组件/主题里的硬编码文案、站点配置与入口 HTML。
// 只认这几个后缀 —— src/themes/pixel/fonts 下的产物自己不在里面,免得自噬。
const SOURCE_EXT = /\.(md|ts|tsx)$/;
const LOOSE_FILES = ['site.yml', 'index.html'].map((name) => join(ROOT, name));

/** ASCII 可打印区(含空格):英文标题、代码、数字都靠它 */
const ASCII = Array.from({ length: 0x7f - 0x20 }, (_, index) =>
  String.fromCodePoint(0x20 + index),
).join('');

/** 常用中文/全角标点:正文里出现得少,但漏一个就是方块,索性整串带上 */
const PUNCTUATION =
  '，。、；：？！…—～「」『』（）〈〉《》【】〔〕“”‘’　·×÷°±→←↑↓①②③④⑤⑥⑦⑧⑨⑩％‰＃＠＆＊＋－／＝｜＿｛｝［］＜＞￥＄§¶†‡•';

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const show = (path) => relative(ROOT, path).replace(/\\/g, '/');

/** 递归列出目录下符合后缀的文件 */
async function walk(dir, filter, acc = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, filter, acc);
    else if (filter(entry.name)) acc.push(full);
  }
  return acc;
}

/** 决定字符集的所有输入:src 下的 md/ts/tsx + 站点配置 + 入口 HTML */
async function sourceFiles() {
  const files = await walk(join(ROOT, 'src'), (name) => SOURCE_EXT.test(name));
  return [...files, ...LOOSE_FILES].sort();
}

/** 输出比这些输入都新就可以跳过 */
async function inputsChanged(out, files) {
  try {
    const target = (await stat(out)).mtimeMs;
    const sources = await Promise.all(
      files.map(async (file) => (await stat(file)).mtimeMs),
    );
    return sources.some((time) => time > target);
  } catch {
    // 输出不存在(或读不了)就当作要重建
    return true;
  }
}

/** 把来源里的字全捞出来:按码点走,代理对不会被拆成半个 */
async function collectChars(files) {
  const chars = new Set();
  for (const file of files) {
    for (const char of await readFile(file, 'utf8')) {
      // 换行、制表这些控制字符不进字体(空格另有来源)
      if (char.codePointAt(0) > 0x1f) chars.add(char);
    }
  }
  return chars;
}

async function main() {
  const started = Date.now();
  const files = await sourceFiles();
  const inputs = [SOURCE_FONT, fileURLToPath(import.meta.url), ...files];

  if (!FORCE && (await inputsChanged(OUT_FONT, inputs)) === false) {
    console.log(`中文字体子集:输入没变,跳过(${show(OUT_FONT)})`);
    return;
  }

  const chars = await collectChars(files);
  for (const char of ASCII + PUNCTUATION) chars.add(char);
  // 按码点排序拼回去:同一批文案永远得到同一份子集,构建产物可比对
  const text = [...chars]
    .sort((a, b) => a.codePointAt(0) - b.codePointAt(0))
    .join('');

  const source = await readFile(SOURCE_FONT);
  const subset = await subsetFont(source, text, { targetFormat: 'woff2' });
  // 静默产出空文件/无效文件是最坏的结果:页面上会整站变方块,这里直接失败
  if (subset.length === 0) throw new Error('子集输出为空');
  if (subset.subarray(0, 4).toString('latin1') !== 'wOF2') {
    throw new Error('子集输出不是 woff2');
  }
  if (subset.length >= source.length) {
    throw new Error(
      `子集 ${subset.length} 字节,没比源字体 ${source.length} 字节小 —— 字符集收集错了?`,
    );
  }

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FONT, subset);

  const seconds = ((Date.now() - started) / 1000).toFixed(2);
  const ratio = ((subset.length / source.length) * 100).toFixed(1);
  console.log(
    `中文字体子集:${chars.size} 个字符 → ${kb(subset.length)}(全量 ${kb(source.length)} 的 ${ratio}%),耗时 ${seconds}s`,
  );
  console.log(`输出:${show(OUT_FONT)}`);
}

try {
  await main();
} catch (error) {
  console.error(`字体子集化失败:${error.message}`);
  process.exitCode = 1;
}
