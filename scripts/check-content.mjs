// 内容体检:扫 src/posts 下的文章,把「写坏了但页面还能打开」的问题挑出来。
//
//   node scripts/check-content.mjs
//
// 检查项:
//   · frontmatter 必须有 title,date 必须是合法日期
//   · 正文里不能再写一级标题(页面标题已经是 h1,再来一个整页就有两个 h1)
//   · 标题层级不能跳级(h2 → h4),跳级的目录树读起来是断的
//   · 正文里的站内链接(/post/xxx、/tags、/categories/xxx …)必须指向真实存在的文章或静态页
//   · 图片 ![alt](src) 必须有 alt 文字(屏幕阅读器、加载失败时都靠它)
//
// 站内链接的目标从 src/posts 的 slug 与 frontmatter 的 categories 推导,静态页用下面的常量清单;
// 外链不联网、不校验,只在结尾提示一句。有问题的行会以「文件:行号: 原因」列出,并让退出码为 1 —— CI 靠它挡住回归。

import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from '../src/data/frontmatter.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const POSTS_DIR = join(ROOT, 'src', 'posts');

// 静态页:与 src/App.tsx 的路由一致(/random 只在路由里有,不进 sitemap,
// 所以 scripts/build-static.mjs 的 STATIC_PAGES 比这份少一项)
// 分类详情页 /categories/<名字> 由 frontmatter 里的 categories 汇总后补上
const STATIC_PAGES = [
  '/',
  '/tags',
  '/categories',
  '/archive',
  '/search',
  '/random',
  '/about',
  '/links',
];

/** 日期写法:2026-09-15 或 2026-09-15 09:30 或 2026-09-15 09:30:00 */
const DATE = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;
// 围栏代码块:``` 与 ~~~,里面的一切都不算正文
const FENCE = /^\s*(```|~~~)/;
// 标题:最多三个空格缩进,# 后面要有内容
const HEADING = /^\s{0,3}(#{1,6})\s+\S/;
// 行内代码:里面的「链接」只是示例,不参与校验
const INLINE_CODE = /`[^`]*`/g;
// 链接与图片:![alt](src) / [text](src),目标允许被尖括号包住
const LINK = /(!?)\[([^\]]*)\]\(\s*<?([^)\s>]*)>?/g;

/**
 * 日期是否合法:先按形状匹配,再用 Date 回查月日(挡住 2026-02-30 这种)。
 * 小时允许不补零(老文章里有 2020-01-09 0:30:20 这种写法)。
 */
function isValidDate(value) {
  const match = DATE.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1, 4).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return false;
  }
  const [hour, minute, second] = match
    .slice(4)
    .map((part) => (part === undefined ? 0 : Number(part)));
  return hour < 24 && minute < 60 && second < 60;
}

/** 扫出所有文章:返回绝对路径,slug 规则与 vite 的 postsIndex 插件一致 */
async function listPostFiles() {
  const entries = await readdir(POSTS_DIR, {
    withFileTypes: true,
    recursive: true,
  });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => join(entry.parentPath ?? POSTS_DIR, entry.name))
    .sort();
}

/** frontmatter 里某个键所在的行号(1 起算),没写这个键就退回第一行 */
function lineOf(lines, pattern) {
  const index = lines.findIndex((line) => pattern.test(line));
  return index === -1 ? 1 : index + 1;
}

/** 站内链接:剥掉查询串、锚点与结尾多余的斜杠,再解开百分号编码 */
function internalTarget(raw) {
  const path = raw.split(/[?#]/)[0].replace(/(.)\/+$/, '$1');
  if (!path.startsWith('/')) return null;
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

async function main() {
  const files = await listPostFiles();
  // 重复 slug 由文件系统挡着(同一个相对路径不可能出现两次),不在这里查
  const slugs = new Set(
    files.map((file) =>
      relative(POSTS_DIR, file).replace(/\\/g, '/').replace(/\.md$/, ''),
    ),
  );

  const problems = [];
  const categories = new Set();
  const posts = [];
  for (const file of files) {
    const raw = await readFile(file, 'utf8');
    const { meta, content } = parseFrontmatter(raw);
    for (const name of meta.categories ?? []) categories.add(name);
    posts.push({
      raw,
      meta,
      content,
      name: relative(ROOT, file).replace(/\\/g, '/'),
    });
  }

  let linkCount = 0;
  for (const { raw, meta, content, name } of posts) {
    const lines = raw.split(/\r?\n/);
    const report = (line, reason) =>
      problems.push({ file: name, line, reason });

    // ---- frontmatter
    if (!meta.title?.trim()) {
      report(lineOf(lines, /^title:/), 'frontmatter 缺少 title');
    }
    const date = meta.date?.trim() ?? '';
    if (!date) {
      report(lineOf(lines, /^date:/), 'frontmatter 缺少 date');
    } else if (!isValidDate(date)) {
      report(lineOf(lines, /^date:/), `date 不是合法日期:${date}`);
    }

    // ---- 正文:逐行扫,围栏内的内容整体跳过
    // 正文在原文里的起始行:frontmatter 那几行要先数掉,报错的行号才对得上编辑器
    const bodyLines = content.split(/\r?\n/);
    const bodyStart =
      raw.slice(0, raw.length - content.length).match(/\n/g)?.length ?? 0;
    let fence = false;
    // 页面标题已经是 h1,所以正文里的标题从 h1 这个层级开始接着往下数
    let previous = 1;
    bodyLines.forEach((rawLine, position) => {
      const line = rawLine.trimEnd();
      const lineNumber = bodyStart + position + 1;
      if (FENCE.test(line)) {
        fence = !fence;
        return;
      }
      if (fence) return;

      const heading = HEADING.exec(line);
      if (heading) {
        const level = heading[1].length;
        if (level === 1) {
          report(
            lineNumber,
            `正文出现一级标题「${line.trim()}」:页面标题已是 h1,再加一个整页会有两个 h1,改成 ##`,
          );
        } else if (level > previous + 1) {
          report(
            lineNumber,
            `标题层级跳级(h${previous} → h${level})「${line.trim()}」:中间缺 h${previous + 1}`,
          );
        }
        previous = level;
      }

      const text = line.replace(INLINE_CODE, '');
      for (const match of text.matchAll(LINK)) {
        const [, bang, alt, target] = match;
        if (bang === '!') {
          if (!alt.trim()) {
            report(lineNumber, `图片缺少 alt 文字:${target || '(空地址)'}`);
          }
          continue;
        }
        const path = internalTarget(target);
        if (!path) continue; // 外链、锚点、相对路径都不在离线校验范围内
        linkCount += 1;
        if (path.startsWith('/post/')) {
          const slug = path.slice('/post/'.length);
          if (!slugs.has(slug)) {
            report(lineNumber, `站内链接指向不存在的文章:${target}`);
          }
          continue;
        }
        if (path.startsWith('/categories/')) {
          const category = path.slice('/categories/'.length);
          if (!categories.has(category)) {
            report(lineNumber, `站内链接指向不存在的分类:${target}`);
          }
          continue;
        }
        if (!STATIC_PAGES.includes(path)) {
          report(lineNumber, `站内链接指向不存在的静态页:${target}`);
        }
      }
    });
  }

  for (const problem of problems) {
    console.log(`✗ ${problem.file}:${problem.line}: ${problem.reason}`);
  }
  console.log(
    `\n内容体检:${files.length} 篇文章(含 ${categories.size} 个分类)、` +
      `${linkCount} 条站内链接`,
  );
  console.log('提示:外部链接(https://…)不联网校验,断没断需要人工确认。');
  if (problems.length > 0) {
    console.log(`${problems.length} 处问题,见上。`);
    process.exitCode = 1;
    return;
  }
  console.log('未发现问题。');
}

await main();
