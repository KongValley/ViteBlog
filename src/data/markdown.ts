// Markdown 渲染:marked + highlight.js,外加几层仓库自用的语法扩展
//   1. ::: note 提示块        → <div class="callout callout-note">
//   2. $$公式$$ / $行内公式$   → 占位元素,交给 ContentEnhancer 用 KaTeX 渲染(默认不进首屏)
//   3. ```mermaid 代码块       → 占位元素,交给 ContentEnhancer 用 Mermaid 渲染
//   4. [^脚注]                → 脚注区(marked 本身不支持 GFM 脚注)
//   5. 代码块                 → 带语言标签与复制按钮的外壳、逐行包裹(行号 + 指定行高亮)
//   6. 图片 / 外链            → 懒加载、图注、外链新窗口打开
// 按需注册语言,控制打包体积;写新文章用到别的语言时在这里加一行即可

import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import css from 'highlight.js/lib/languages/css';
import diff from 'highlight.js/lib/languages/diff';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import go from 'highlight.js/lib/languages/go';
import ini from 'highlight.js/lib/languages/ini';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import kotlin from 'highlight.js/lib/languages/kotlin';
import lua from 'highlight.js/lib/languages/lua';
import markdown from 'highlight.js/lib/languages/markdown';
import nginx from 'highlight.js/lib/languages/nginx';
import php from 'highlight.js/lib/languages/php';
import plaintext from 'highlight.js/lib/languages/plaintext';
import powershell from 'highlight.js/lib/languages/powershell';
import python from 'highlight.js/lib/languages/python';
import ruby from 'highlight.js/lib/languages/ruby';
import rust from 'highlight.js/lib/languages/rust';
import scss from 'highlight.js/lib/languages/scss';
import sql from 'highlight.js/lib/languages/sql';
import swift from 'highlight.js/lib/languages/swift';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import { Marked } from 'marked';
import { variantsFor } from './images';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('yml', yaml);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('css', css);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('md', markdown);
hljs.registerLanguage('plaintext', plaintext);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('tsx', typescript);
hljs.registerLanguage('jsx', javascript);
// 其余常用语言:每加一个,highlight.js 的体积也只多一点(整包仍在按需加载的文章页 chunk 里)。
// 需要更多(比如 zig / elixir)再照着加一行 import + 一行 register 即可。
for (const [names, language] of [
  [['go', 'golang'], go],
  [['rust', 'rs'], rust],
  [['java'], java],
  [['kotlin', 'kt'], kotlin],
  [['swift'], swift],
  [['c'], c],
  [['cpp', 'c++', 'cc', 'h', 'hpp'], cpp],
  [['php'], php],
  [['ruby', 'rb'], ruby],
  [['sql'], sql],
  [['dockerfile', 'docker'], dockerfile],
  [['nginx', 'conf'], nginx],
  [['powershell', 'ps1', 'ps'], powershell],
  [['ini', 'toml'], ini],
  [['scss', 'sass'], scss],
  [['lua'], lua],
  [['diff', 'patch'], diff],
] as const) {
  for (const name of names) hljs.registerLanguage(name, language);
}

const CALLOUT_LABEL: Record<string, string> = {
  note: '说明',
  tip: '提示',
  warning: '注意',
  danger: '警告',
  info: '信息',
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ```ts {2,5-7} —— 指定要高亮的行
function parseHighlightRanges(spec: string): Set<number> {
  const lines = new Set<number>();
  const body = spec.trim().replace(/^\{|\}$/g, '');
  if (!body) return lines;
  for (const part of body.split(/[,，]/)) {
    const [from, to] = part.split('-').map((value) => Number(value.trim()));
    if (!Number.isFinite(from)) continue;
    const end = Number.isFinite(to) ? to : from;
    for (let n = from; n <= end; n += 1) lines.add(n);
  }
  return lines;
}

function renderCodeBlock(code: string, lang: string): string {
  const info = lang.trim();
  const [language = '', highlightSpec = ''] = info.split(/\s+/);

  if (language === 'mermaid') {
    return `<div class="mermaid" data-source="${escapeHtml(code)}"><pre class="mermaid-source">${escapeHtml(code)}</pre></div>`;
  }

  const highlighted = hljs.getLanguage(language)
    ? hljs.highlight(code, { language }).value
    : escapeHtml(code);
  const highlightedLines = parseHighlightRanges(highlightSpec);
  const body = highlighted
    .replace(/\n$/, '')
    .split('\n')
    .map((line, index) => {
      const number = index + 1;
      const classes = highlightedLines.has(number)
        ? 'code-line code-line-hl'
        : 'code-line';
      return `<span class="${classes}" data-line="${number}">${line || ' '}</span>`;
    })
    .join('\n');

  const label = language || 'text';
  return [
    `<div class="code-block" data-lang="${escapeHtml(label)}">`,
    `<div class="code-bar"><span class="code-lang">${escapeHtml(label)}</span>`,
    '<button type="button" class="code-copy" data-copied="false">复制</button></div>',
    `<pre class="hljs"><code class="language-${escapeHtml(label)}">${body}</code></pre>`,
    '</div>',
  ].join('');
}

const marked = new Marked({
  gfm: true,
  renderer: {
    code({ text, lang }) {
      return renderCodeBlock(text, lang ?? '');
    },
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens);
      return `<h${depth}>${text}</h${depth}>`;
    },
  },
});

// CommonMark 的强调规则对中文标点不友好：闭 ** 前面是中文标点、后面紧跟文字时
// （如「**……首选。**个人版」）会被判定为无法闭合，** 原样输出。
// 解析前把星号内的句末中文标点移到星号外，渲染结果几乎不变，绕开这条规则。
const CJK_PUNCT = '。，、；：！？」』）】》';

function fixCjkStrong(source: string): string {
  return source.replace(
    new RegExp(
      `(?<![\\p{L}\\p{N}*])\\*\\*(?!\\s)([^*\\n]*?)([${CJK_PUNCT}])\\*\\*(?=[^\\s*${CJK_PUNCT}"'（）【】《》()\\[\\]{}.,!?;:-])`,
      'gu',
    ),
    '**$1**$2',
  );
}

// 把源码切成“代码段 / 普通文本”交替的片段,扩展语法只在普通文本里生效,
// 免得代码块里的 ::: 或 $ 被误伤。
//   fencedOnly=true 时只避开围栏代码块 —— 提示块是块级语法,里面可以写行内代码,
//   若按行内代码切分,`::: note` 到闭合 `:::` 之间含反引号就会被拆成两段而匹配不上
function mapOutsideCode(
  source: string,
  transform: (text: string) => string,
  fencedOnly = false,
) {
  const pattern = fencedOnly
    ? /(```[\s\S]*?(?:```|$))/g
    : /(```[\s\S]*?(?:```|$)|`[^`\n]*`)/g;
  return source
    .split(pattern)
    .map((part, index) => (index % 2 === 1 ? part : transform(part)))
    .join('');
}

// ::: note 标题 … :::  → 提示块
function expandCallouts(source: string): string {
  return mapOutsideCode(
    source,
    (text) =>
      text.replace(
        /^:::[ \t]*([a-zA-Z]+)[ \t]*([^\n]*)\n([\s\S]*?)\n:::[ \t]*$/gm,
        (_match, rawKind: string, rawTitle: string, body: string) => {
          const kind = rawKind.toLowerCase();
          const label = CALLOUT_LABEL[kind] ?? rawKind;
          const title = rawTitle.trim() || label;
          const inner = marked.parse(body.trim()) as string;
          return `<div class="callout callout-${escapeHtml(kind)}"><p class="callout-title">${escapeHtml(title)}</p><div class="callout-body">${inner}</div></div>`;
        },
      ),
    true,
  );
}

// $$公式$$ / $行内公式$ → 占位元素(具体渲染交给 ContentEnhancer,KaTeX 不进首屏)
function hideMath(source: string): string {
  return mapOutsideCode(source, (text) =>
    text
      .replace(/\$\$([\s\S]+?)\$\$/g, (_m, tex: string) => {
        return `<span class="math-block" data-tex="${escapeHtml(tex.trim())}"></span>`;
      })
      .replace(
        // 行内公式:两侧不能是空白或数字,避免把价格 $5 / $10 当成公式
        /(?<![\w$])\$(?!\s)([^$\n]+?)(?<!\s)\$(?![\d\w$])/g,
        (_m, tex: string) =>
          `<span class="math-inline" data-tex="${escapeHtml(tex.trim())}"></span>`,
      ),
  );
}

// [^1] 引用 + [^1]: 定义 → 文末脚注区(marked 不认 GFM 脚注,自己拼)
function expandFootnotes(source: string): string {
  const definitions = new Map<string, string>();
  const withoutDefs = mapOutsideCode(source, (text) =>
    text
      .split('\n')
      .filter((line) => {
        const match = line.match(/^\[\^([^\]]+)\]:\s*(.+)$/);
        if (!match) return true;
        definitions.set(match[1], match[2].trim());
        return false;
      })
      .join('\n'),
  );

  if (definitions.size === 0) return withoutDefs;

  const order: string[] = [];
  const withRefs = mapOutsideCode(withoutDefs, (text) =>
    text.replace(/\[\^([^\]]+)\]/g, (_match, id: string) => {
      if (!definitions.has(id)) return _match;
      if (!order.includes(id)) order.push(id);
      const number = order.indexOf(id) + 1;
      return `<sup class="footnote-ref" id="fnref-${escapeHtml(id)}"><a href="#fn-${escapeHtml(id)}">${number}</a></sup>`;
    }),
  );

  const items = order
    .map((id, index) => {
      const body = marked.parseInline(definitions.get(id) ?? '') as string;
      return `<li id="fn-${escapeHtml(id)}"><span class="footnote-index">${index + 1}</span><span class="footnote-body">${body}</span> <a class="footnote-back" href="#fnref-${escapeHtml(id)}" aria-label="回到正文">↩</a></li>`;
    })
    .join('');

  return `${withRefs}\n\n<section class="footnotes"><p class="footnotes-title">脚注</p><ol>${items}</ol></section>\n`;
}

// 图片:统一懒加载 + 有 title 的包成图注;本地图若构建期生成了 webp 变体,升级成 <picture>
function decorateImages(html: string): string {
  return html.replace(/<img\b[^>]*>/g, (tag) => {
    let next = tag;
    const src = next.match(/\bsrc="([^"]+)"/)?.[1] ?? '';
    const entry = src ? variantsFor(src) : undefined;

    if (!/\bloading=/.test(next)) {
      next = next.replace(/<img\b/, '<img loading="lazy"');
    }
    if (!/\bdecoding=/.test(next)) {
      next = next.replace(/<img\b/, '<img decoding="async"');
    }
    if (!/\bclass=/.test(next)) {
      next = next.replace(/<img\b/, '<img class="post-image"');
    }

    if (entry) {
      // width/height 写出来是为了避免加载时布局抖动
      next = next.replace(
        /<img\b/,
        `<img width="${entry.width}" height="${entry.height}"`,
      );
      const srcset = entry.variants
        .map((variant) => `${variant.src} ${variant.w}w`)
        .join(', ');
      return `<picture><source type="image/webp" srcset="${srcset}" sizes="(max-width: 900px) 100vw, 880px">${next}</picture>`;
    }
    return next;
  });
}

function decorateFigures(html: string): string {
  // <p><img alt title="图注"></p> → <figure>…<figcaption>图注</figcaption></figure>
  return html.replace(
    /<p>\s*(<img\b[^>]*\btitle="([^"]*)"[^>]*>)\s*<\/p>/g,
    (_match, tag: string, caption: string) =>
      `<figure class="post-figure">${tag}<figcaption>${caption}</figcaption></figure>`,
  );
}

// 正文里的外链一律新窗口打开(站内链接由 Post 页拦截走 SPA 跳转)
function decorateLinks(html: string): string {
  return html.replace(
    /<a\b([^>]*href="https?:\/\/[^"]*"[^>]*)>/g,
    (tag, attrs: string) => {
      if (/target=/.test(attrs)) return tag;
      return `<a${attrs} target="_blank" rel="noopener noreferrer">`;
    },
  );
}

export function renderMarkdown(source: string): string {
  const prepared = expandFootnotes(
    hideMath(expandCallouts(fixCjkStrong(source))),
  );
  const html = marked.parse(prepared) as string;
  return (
    decorateLinks(decorateFigures(decorateImages(html)))
      // 站内链接与本地图片都要补上部署 base,否则在 GitHub Pages 的 /ViteBlog/ 子路径下会 404
      .replace(
        /href="\/(?!\/)([^"]*)"/g,
        (_match, path: string) => `href="${import.meta.env.BASE_URL}${path}"`,
      )
      .replace(
        /src="\/(?!\/)([^"]*)"/g,
        (_match, path: string) => `src="${import.meta.env.BASE_URL}${path}"`,
      )
  );
}

export { escapeHtml };
