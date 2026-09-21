// 新建文章脚手架:一条命令在 src/posts/ 下生成带 frontmatter 的文章模板
//
//   npm run new -- "我的新文章"                  → src/posts/我的新文章.md
//   npm run new -- notes/我的新文章 "笔记:我的新文章"  → 放进子目录,并显式指定标题
//
// 文件名就是链接 slug(相对 src/posts/,不含 .md),子目录用 / 分隔。
// 生成后 dev server 会立刻热更新,文章按 frontmatter 的 date 倒序排在最前。

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const POSTS_DIR = join(ROOT, 'src', 'posts');

const USAGE = `用法:
  npm run new -- "文章标题"
  npm run new -- 子目录/文件名 "文章标题(含空格或标点时,用第二个参数显式指定)"

示例:
  npm run new -- "Vite 插件入门"
  npm run new -- notes/vite-plugin "Vite 插件入门:从 0 写一个"`;

const [rawSlug, rawTitle] = process.argv.slice(2);

if (!rawSlug || rawSlug === '--help' || rawSlug === '-h') {
  console.log(USAGE);
  process.exit(rawSlug ? 0 : 1);
}

// 文件名:去掉前后空白与首尾斜杠,空白折成连字符,顺手清掉 Windows 下非法的字符
function toSlug(input) {
  return input
    .trim()
    .replace(/\.md$/i, '')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\s+/g, '-')
    .replace(/[:*?"<>|]/g, '')
    .replace(/\/{2,}/g, '/');
}

const slug = toSlug(rawSlug);
if (!slug) {
  console.error('文件名为空,换个标题试试。\n');
  console.error(USAGE);
  process.exit(1);
}

// 标题:不给第二个参数就拿文件名当标题(文件名里的 - 还原成空格)
const title = (rawTitle ?? rawSlug.replace(/^.*\//, '').replace(/\.md$/i, ''))
  .replace(/\s+/g, ' ')
  .trim();
if (!title) {
  console.error('标题为空,换个标题试试。\n');
  console.error(USAGE);
  process.exit(1);
}

const file = join(POSTS_DIR, `${slug}.md`);
if (existsSync(file)) {
  console.error(`已经存在:${relative(ROOT, file).replace(/\\/g, '/')}`);
  console.error('换个文件名,或直接打开它继续写。');
  process.exit(1);
}

// 带时分秒的本地时间:同一天写多篇时,后写的排前面(列表按 date 倒序)
const now = new Date();
const pad = (value) => String(value).padStart(2, '0');
const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

const template = `---
title: ${title}
date: ${date}
tags:
  - 待补
categories:
  - 待补
excerpt: 一句话摘要,会显示在首页卡片上。
# cover: /images/封面图.jpg   # 可选:卡片头图与文章页头图
---

开头一段:这篇要解决什么问题、写给谁看。

## 小节标题

正文……代码块直接写围栏,语法高亮按语言自动开:

\`\`\`ts
const hello = (name: string) => \`hello, \${name}\`;
\`\`\`

## 小结

回过头看,关键结论是什么。
`;

mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, template, 'utf8');

const path = relative(ROOT, file).replace(/\\/g, '/');
console.log(`已创建 ${path}`);
console.log(`标题:${title}`);
console.log(`本地预览:npm run dev → /post/${slug}`);
console.log('记得把 tags / categories / excerpt 换成真实内容。');
