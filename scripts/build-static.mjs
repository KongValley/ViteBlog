// 构建期静态产物:feed.xml / atom.xml / sitemap.xml / robots.txt,
// 外加每篇文章一份带正确 <head> 的 dist/post/<slug>.html。
//
// 站点是纯 SPA,页面 meta 全靠 React 在运行时写;微信、Twitter 这类抓取器
// 不跑 JS,搜索引擎也拿不到标题和摘要。所以构建后在这里补一份静态文件:
// script 标签原样保留,用户打开时仍然是 React 接管,只是抓取器先读到 meta。
//
//   node scripts/build-static.mjs      # 需要先有 dist/index.html(npm run build)
//
// 脚本只读 src/ 与 dist/index.html,产物全部落在 dist/ 下,可以重复执行。

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { countWords, parseFrontmatter } from '../src/data/frontmatter.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');
const POSTS_DIR = join(ROOT, 'src', 'posts');
const INDEX_HTML = join(DIST, 'index.html');
const OG_DIR = join(DIST, 'og');

// feed 只放最新的这些篇;正文用摘要,别把整站原文塞进 XML
const FEED_SIZE = 20;

// 静态页(与 src/App.tsx 的路由一致);分类详情页由 allCategories 枚举后补上
const STATIC_PAGES = [
  '/',
  '/tags',
  '/categories',
  '/archive',
  '/search',
  '/about',
];

// ---------------------------------------------------------------- 基础工具

// XML 与 HTML 属性共用:& < > " ' 五者转义后两边都合法
function escapeText(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (ch) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
      })[ch],
  );
}

// frontmatter 的 date 不带时区(如 2026-01-02 15:30:00),统一按 UTC 解析:
// 本地机器与 CI(GitHub Actions 跑在 UTC)产出的时间戳才一致
function postDate(post) {
  const match = (post.date ?? '').match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (!match) return null;
  return new Date(
    Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4] ?? 0),
      Number(match[5] ?? 0),
      Number(match[6] ?? 0),
    ),
  );
}

// RSS 2.0 要 RFC-822(Wed, 02 Jan 2026 15:30:00 GMT),Atom 与 sitemap 要 ISO-8601
const rfc822 = (date) => date.toUTCString();
const iso = (date) => date.toISOString();

function readSiteConfig() {
  const file = resolve(ROOT, 'site.yml');
  try {
    return parse(readFileSync(file, 'utf8')) ?? {};
  } catch (err) {
    throw new Error(
      `site.yml 解析失败,请检查格式(注意冒号后要有空格):${err.message}`,
    );
  }
}

// base 以 vite.config.ts 为准(仓库改名时只有那一处要改),读不出来再退回默认值
function readBase() {
  const fallback = '/ViteBlog/';
  try {
    const raw = readFileSync(resolve(ROOT, 'vite.config.ts'), 'utf8');
    const match = raw.match(/base:\s*['"]([^'"]+)['"]/);
    if (!match) return fallback;
    return match[1].endsWith('/') ? match[1] : `${match[1]}/`;
  } catch {
    return fallback;
  }
}

// 站点绝对地址 = GitHub Pages 域名 + vite 的 base(项目页的 base 就是 /仓库名/)。
// 域名从 site.yml 的仓库地址推:https://github.com/<user>/<repo> → https://<user>.github.io
// (主机名大小写不敏感,统一小写);顺便核对仓库名与 base 是否还一致。
function resolveOrigin(site, base) {
  const user =
    typeof site.githubUser === 'string' ? site.githubUser.trim() : '';
  const repo =
    typeof site.github === 'string'
      ? site.github.match(/^https?:\/\/github\.com\/([^/\s]+)\/([^/#?\s]+)/i)
      : null;

  const owner = repo ? repo[1] : user;
  if (!owner) {
    throw new Error(
      'site.yml 里 github 与 githubUser 都没填,推导不出站点地址(feed/sitemap 需要绝对链接)',
    );
  }

  if (repo && repo[2] !== base.replace(/^\/+|\/+$/g, '')) {
    console.warn(
      `[build-static] 仓库名(${repo[2]})与 vite.config.ts 的 base(${base})不一致,静态链接可能指错地方`,
    );
  }

  return `https://${owner.toLowerCase()}.github.io`;
}

// ---------------------------------------------------------------- 文章扫描

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith('.md') ? [full] : [];
  });
}

// 元信息直接用 vite 插件那套解析(同一份 frontmatter.ts),不另起规则
function readPosts() {
  const list = walk(POSTS_DIR).map((file) => {
    const { meta, content } = parseFrontmatter(readFileSync(file, 'utf8'));
    return {
      slug: relative(POSTS_DIR, file).replace(/\\/g, '/').replace(/\.md$/, ''),
      title: meta.title ?? '未命名文章',
      date: meta.date ?? '',
      tags: meta.tags ?? [],
      categories: meta.categories ?? [],
      excerpt: meta.excerpt ?? '',
      words: countWords(content),
    };
  });

  // 与 vite 插件同规则:date 倒序,同日按 slug;顺序稳定,产物才能重复生成
  list.sort(
    (a, b) =>
      (a.date < b.date ? 1 : a.date > b.date ? -1 : 0) ||
      (a.slug < b.slug ? -1 : 1),
  );
  return list;
}

// ---------------------------------------------------------------- URL 拼接

function createUrls(base, origin) {
  // 路径逐段转义:CJK / 空格这类字符在 sitemap 与 feed 里都得是 %XX 形式
  const encodePath = (path) =>
    String(path).split('/').map(encodeURIComponent).join('/');

  // base 已带首尾斜杠,这里统一产出不带尾斜杠的页面地址(首页除外)
  const abs = (path) =>
    `${origin}${base}${encodePath(String(path).replace(/^\//, ''))}`;

  return {
    origin,
    base,
    home: `${origin}${base}`,
    page: abs,
    post: (slug) => abs(`/post/${slug}`),
  };
}

// ---------------------------------------------------------------- feed / 站点地图

function renderRss(posts, site, urls) {
  const items = posts.slice(0, FEED_SIZE).map((post) => {
    const date = postDate(post);
    const url = urls.post(post.slug);
    return [
      '    <item>',
      `      <title>${escapeText(post.title)}</title>`,
      `      <link>${escapeText(url)}</link>`,
      `      <guid isPermaLink="true">${escapeText(url)}</guid>`,
      `      <description>${escapeText(post.excerpt)}</description>`,
      date ? `      <pubDate>${rfc822(date)}</pubDate>` : null,
      '    </item>',
    ]
      .filter(Boolean)
      .join('\n');
  });

  const newest = postDate(posts[0] ?? {}) ?? null;

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeText(site.name)}</title>`,
    `    <link>${escapeText(urls.home)}</link>`,
    `    <description>${escapeText(site.tagline)}</description>`,
    '    <language>zh-CN</language>',
    `    <atom:link href="${escapeText(`${urls.home}feed.xml`)}" rel="self" type="application/rss+xml" />`,
    // 用最新一篇的日期而不是当前时间:重复构建产物不变,方便比对
    newest ? `    <lastBuildDate>${rfc822(newest)}</lastBuildDate>` : null,
    ...items,
    '  </channel>',
    '</rss>',
    '',
  ]
    .filter((line) => line !== null)
    .join('\n');
}

function renderAtom(posts, site, urls) {
  const entries = posts.slice(0, FEED_SIZE).map((post) => {
    const date = postDate(post);
    const url = urls.post(post.slug);
    return [
      '  <entry>',
      `    <title>${escapeText(post.title)}</title>`,
      `    <link rel="alternate" href="${escapeText(url)}" />`,
      `    <id>${escapeText(url)}</id>`,
      date ? `    <updated>${iso(date)}</updated>` : null,
      date ? `    <published>${iso(date)}</published>` : null,
      `    <summary>${escapeText(post.excerpt)}</summary>`,
      '  </entry>',
    ]
      .filter(Boolean)
      .join('\n');
  });

  const newest = postDate(posts[0] ?? {}) ?? null;

  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    `  <title>${escapeText(site.name)}</title>`,
    `  <subtitle>${escapeText(site.tagline)}</subtitle>`,
    `  <link rel="self" href="${escapeText(`${urls.home}atom.xml`)}" />`,
    `  <link rel="alternate" href="${escapeText(urls.home)}" />`,
    `  <id>${escapeText(urls.home)}</id>`,
    newest ? `  <updated>${iso(newest)}</updated>` : null,
    '  <author>',
    `    <name>${escapeText(site.author)}</name>`,
    site.github ? `    <uri>${escapeText(site.github)}</uri>` : null,
    '  </author>',
    ...entries,
    '</feed>',
    '',
  ]
    .filter((line) => line !== null)
    .join('\n');
}

// sitemap 里的 lastmod 用文章自己的日期(静态页用最新一篇的日期)
function renderSitemap(posts, urls, categories) {
  const newest = postDate(posts[0] ?? {}) ?? null;
  const pageLastmod = newest ? iso(newest).slice(0, 10) : null;

  const entries = [
    ...STATIC_PAGES.map((path) => ({
      loc: urls.page(path),
      lastmod: pageLastmod,
    })),
    // 分类详情页是真实路由(/categories/:name),一并交给搜索引擎
    ...categories.map((name) => ({
      loc: urls.page(`/categories/${name}`),
      lastmod: pageLastmod,
    })),
    ...posts.map((post) => {
      const date = postDate(post);
      return {
        loc: urls.post(post.slug),
        lastmod: date ? iso(date).slice(0, 10) : null,
      };
    }),
  ];

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.flatMap((entry) => [
      '  <url>',
      `    <loc>${escapeText(entry.loc)}</loc>`,
      entry.lastmod ? `    <lastmod>${entry.lastmod}</lastmod>` : null,
      '  </url>',
    ]),
    '</urlset>',
    '',
  ]
    .filter((line) => line !== null)
    .join('\n');
}

function renderRobots(urls) {
  return [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${urls.home}sitemap.xml`,
    '',
  ].join('\n');
}

// ---------------------------------------------------------------- 预渲染 HTML

// OG 图由构建期脚本产到 dist/og/<slug>.png(带子目录的 slug 用 __ 连接);
// dist/og 不存在或某一篇没生成时降级到站点默认分享图
function ogImageFor(slug) {
  const candidates = [slug, slug.replace(/\//g, '__')];
  for (const name of candidates) {
    const file = join(OG_DIR, `${name}.png`);
    if (existsSync(file)) {
      return { url: `${urls.page(`/og/${name}.png`)}`, fromOg: true };
    }
  }
  return { url: defaultShareImage(), fromOg: false };
}

// 和 pageMeta.ts 的运行时规则保持一致:头像(本地文件)优先,其次站点图标
function defaultShareImage() {
  const avatar = typeof site.avatar === 'string' ? site.avatar.trim() : '';
  if (avatar && /^https?:\/\//i.test(avatar)) return avatar;

  const local = avatar.replace(/^\//, '');
  if (local && existsSync(join(DIST, local))) return urls.page(`/${local}`);

  return urls.page('/favicon.svg');
}

// 只改 <head>:<title> / description / og:* / canonical。
// 模板里若已经写死了 og 或 canonical,先摘掉再写本次的,避免出现两份。
function renderPostHtml(template, post) {
  const url = urls.post(post.slug);
  const title = post.title.includes(site.name)
    ? post.title
    : `${post.title} · ${site.name}`;
  const description = post.excerpt || site.tagline;
  const image = ogImageFor(post.slug);

  const head = [
    `    <link rel="canonical" href="${escapeText(url)}" />`,
    `    <meta property="og:title" content="${escapeText(title)}" />`,
    `    <meta property="og:description" content="${escapeText(description)}" />`,
    `    <meta property="og:url" content="${escapeText(url)}" />`,
    '    <meta property="og:type" content="article" />',
    `    <meta property="og:image" content="${escapeText(image.url)}" />`,
  ].join('\n');

  const html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeText(title)}</title>`)
    .replace(
      /<meta\s+name="description"[^>]*>/i,
      `<meta name="description" content="${escapeText(description)}" />`,
    )
    .replace(/\s*<meta\s+[^>]*property="og:[^"]*"[^>]*>/gi, '')
    .replace(/\s*<link\s+[^>]*rel="canonical"[^>]*>/gi, '');

  // script 标签原样保留:线上打开时由 React 接管,静态 head 只是给抓取器看的
  return html.replace(/\s*<\/head>/, `\n${head}\n  </head>`);
}

// ---------------------------------------------------------------- 主流程

if (!existsSync(INDEX_HTML)) {
  console.error(
    '[build-static] 找不到 dist/index.html —— 请先执行 npm run build 生成 dist,再跑本脚本',
  );
  process.exit(1);
}

const site = readSiteConfig();
const base = readBase();
const urls = createUrls(base, resolveOrigin(site, base));
const posts = readPosts();
const categories = [
  ...new Set(posts.flatMap((post) => post.categories)),
].sort();

const template = readFileSync(INDEX_HTML, 'utf8');
mkdirSync(DIST, { recursive: true });

writeFileSync(join(DIST, 'feed.xml'), renderRss(posts, site, urls), 'utf8');
writeFileSync(join(DIST, 'atom.xml'), renderAtom(posts, site, urls), 'utf8');
writeFileSync(
  join(DIST, 'sitemap.xml'),
  renderSitemap(posts, urls, categories),
  'utf8',
);
writeFileSync(join(DIST, 'robots.txt'), renderRobots(urls), 'utf8');

for (const post of posts) {
  const file = join(DIST, 'post', `${post.slug}.html`);
  mkdirSync(dirname(file), { recursive: true }); // slug 带子目录时要先建目录
  writeFileSync(file, renderPostHtml(template, post), 'utf8');
}

const fallback = posts.filter((post) => !ogImageFor(post.slug).fromOg).length;
const addressCount = STATIC_PAGES.length + categories.length + posts.length;
console.log(`[build-static] 站点地址 ${urls.home}`);
console.log(
  `[build-static] feed.xml / atom.xml 各 ${Math.min(posts.length, FEED_SIZE)} 篇`,
);
console.log(`[build-static] sitemap.xml ${addressCount} 个地址`);
console.log('[build-static] robots.txt');
console.log(
  `[build-static] 预渲染 ${posts.length} 篇文章 → dist/post/<slug>.html` +
    (fallback > 0 ? `(其中 ${fallback} 篇没有 og 图,用默认分享图)` : ''),
);
