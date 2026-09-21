// 全文搜索索引:把 src/posts/**/*.md 的正文压成纯文本,产出 public/search-index.json。
//
//   node scripts/build-search-index.mjs [--force]
//
// 为什么这件事只能在构建期做:
//   正文在运行时是 import.meta.glob('?raw') 按需拉的(src/data/posts.ts),内存里只有
//   frontmatter 那点元信息 —— 搜索页压根看不到正文。搜索页进页时 fetch 一次这个索引
//   (懒加载,取不到就退回元信息打分),正文搜索才成立。
//
// 为什么存纯文本而不是分词结果:
//   中文没有词边界,搜索端本来就用子串包含匹配;存原文既知道命中在哪儿,
//   也能直接切出「命中词前后各 20 字」的片段,摆进结果列表。
//
// 代码围栏里的代码也算正文(hideCode 只丢掉围栏那一行):技术博客里 useState /
// git rebase 这类标识符常常只出现在代码块里,搜不到就等于没有。
//
// 幂等:输出比所有 .md 和脚本自身都新就跳过(除非 --force),
// 所以挂在 predev/prebuild 上不会拖慢每次启动。

import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from '../src/data/frontmatter.ts';
import { listPosts, POSTS_DIR, ROOT } from './lib/cards.mjs';

const OUT = join(ROOT, 'public', 'search-index.json');
const FORCE = process.argv.includes('--force');

/** 体积预算:public/ 下的文件不经打包器,但还是得下载,超了就该回头精简正文了 */
const SIZE_BUDGET = 400 * 1024;

/** 代码行在正文里的占位符:私用区字符(PUA)。文章里不会出现它,
 *  而且它不是控制字符 —— biome 的 noControlCharactersInRegex 只收控制字符 */
const CODE_MARK = '\uE000';

/**
 * 代码围栏:只去掉围栏那一行(```/~~~),里面的代码留着 —— 这是技术博客,
 * 搜 useState / git rebase 这类只出现在代码里的标识符是刚需。
 *
 * 按行扫而不是一把正则:收尾的围栏必须是同一种记号(``` 配 ```)、且不短于开始的那个,
 * 这种事一行一行看才说得清,正则里非贪婪 + `$` 很容易在第一行就误判收尾。
 *
 * 代码行先存进 code[]、正文里只留一个占位符:代码里的 * _ [ ] # 不是 markdown 记号,
 * 得躲开下面的剥记号流程(否则 Python 的 **kwargs 会被当成粗体吃掉)。
 */
function hideCode(markdown, code) {
  const kept = [];
  let opening = '';
  for (const line of markdown.split('\n')) {
    const fence = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (opening) {
      // 围栏收尾:这一行本身就是记号,围栏之间的行才是代码
      if (fence && fence[0] === opening[0] && fence.length >= opening.length) {
        opening = '';
      } else {
        code.push(line);
        kept.push(`${CODE_MARK}${code.length - 1}${CODE_MARK}`);
      }
      continue;
    }
    if (fence) {
      opening = fence;
      continue;
    }
    kept.push(line);
  }
  return kept.join('\n');
}

/**
 * markdown → 纯文本:只留人眼在文章页上真能看到的字,记号一律剥掉。
 * 行内代码只丢反引号、围栏代码整块留下(见 hideCode):里面的函数名/命令正是值得搜的东西。
 */
function stripMarkdown(markdown) {
  const code = [];
  return (
    hideCode(markdown, code)
      // 注释、HTML 标签:整个丢掉
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<\/?[a-zA-Z][^>]*>/g, ' ')
      // 转义先还原,免得下面的强调规则把 \$ 之类的护身符也顺手吃了
      .replace(/\\([\\`*_{}[\]()#+\-.!>~|])/g, '$1')
      // 行内代码留字不留记号
      .replace(/`([^`\n]*)`/g, '$1')
      // 图片留 alt(图挂掉时页面上显示的就是它),链接留链接文字
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]*)\]\[[^\]]*\]/g, '$1')
      // 标题的 #、引用的 >、列表记号、分隔线
      .replace(/^ {0,3}#{1,6}[ \t]+/gm, '')
      .replace(/^ {0,3}>[ \t]?/gm, '')
      .replace(/^ {0,3}(?:[-*+]|\d{1,9}[.)])[ \t]+/gm, '')
      .replace(/^ {0,3}(?:[-*_][ \t]*){3,}$/gm, ' ')
      // 表格:只去竖线,留住单元格里的字
      .replace(/^ {0,3}\|.*\|[ \t]*$/gm, (row) => row.replace(/\|/g, ' '))
      // 强调记号。下划线只在成对包住整词时才算记号,免得把 snake_case 拆了
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*\n]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/(?<![A-Za-z0-9_])_([^_\n]+)_(?![A-Za-z0-9_])/g, '$1')
      .replace(/~~([^~]+)~~/g, '$1')
      // 记号剥完,把代码原样还回去 —— 顺序很关键:先还代码,再压空白
      .replace(/\uE000(\d+)\uE000/g, (_, index) => code[Number(index)])
      // 压空白:整篇一行,片段窗口切起来才不用管换行
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/** 一篇文章的索引条目:元信息 + 压好的正文 */
function entryOf(file, raw) {
  const { meta, content } = parseFrontmatter(raw);
  return {
    // slug 规则与 vite 的 postsIndex 插件保持一致(相对 src/posts 的路径去掉 .md)
    slug: relative(POSTS_DIR, file).replace(/\\/g, '/').replace(/\.md$/, ''),
    title: meta.title ?? '未命名文章',
    date: meta.date ?? '',
    tags: meta.tags ?? [],
    categories: meta.categories ?? [],
    excerpt: meta.excerpt ?? '',
    text: stripMarkdown(content),
  };
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
    return true;
  }
}

/** 索引只由这些输入决定:文章本身 + 本脚本(改剥正文的规则就得重建) */
const TRACKED = [fileURLToPath(import.meta.url)];

async function main() {
  const started = Date.now();
  const files = await listPosts();
  if (files.length === 0) {
    console.error(`没有在 ${relative(ROOT, POSTS_DIR)} 下找到任何 .md`);
    process.exitCode = 1;
    return;
  }

  if (!FORCE && (await inputsChanged(OUT, [...files, ...TRACKED])) === false) {
    console.log(
      `搜索索引:输入没变,跳过(${relative(ROOT, OUT).replace(/\\/g, '/')})`,
    );
    return;
  }

  const entries = await Promise.all(
    files.map(async (file) => entryOf(file, await readFile(file, 'utf8'))),
  );
  // 不缩进:这个文件每进一次搜索页都要下,空白字符也是字节
  const json = JSON.stringify({ posts: entries });
  const bytes = Buffer.byteLength(json);
  const chars = entries.reduce((sum, entry) => sum + entry.text.length, 0);
  const seconds = ((Date.now() - started) / 1000).toFixed(2);

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, json, 'utf8');

  console.log(
    `搜索索引:${entries.length} 篇 · JSON ${(bytes / 1024).toFixed(1)} KB · 纯文本 ${chars} 字 · 用时 ${seconds}s`,
  );
  console.log(`输出:${relative(ROOT, OUT).replace(/\\/g, '/')}`);
  if (bytes > SIZE_BUDGET) {
    console.warn(
      `索引体积超过 ${SIZE_BUDGET / 1024} KB 预算,正文该压缩或分片了`,
    );
  }
}

await main();
