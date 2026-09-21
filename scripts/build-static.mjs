// 构建期静态产物:feed.xml / atom.xml / feed.json / sitemap.xml / robots.txt,
// 外加每篇文章一份 dist/post/<slug>.html,以及首页/标签/分类/归档/搜索/关于/友链
// 各自一份 <路径>/index.html。
//
// 站点是纯 SPA,页面 meta 全靠 React 在运行时写;微信、Twitter 这类抓取器
// 不跑 JS,搜索引擎也拿不到标题和摘要。所以构建后在这里补一份静态文件:
// script 标签原样保留,用户打开时仍然是 React 接管,只是抓取器先读到 meta。
// 静态页必须真的落盘(而不只是写进 sitemap),否则线上 /tags 这种地址直接 404。
//
//   node scripts/build-static.mjs      # 需要先有 dist/index.html(npm run build)
//
// 脚本只读 src/ 与 dist/index.html,产物全部落在 dist/ 下,可以重复执行。

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { countWords, parseFrontmatter } from '../src/data/frontmatter.ts';
// 分享卡(build-og.mjs)与自动封面(build-covers.mjs)的统一尺寸:og:image 要报给抓取器
import { HEIGHT as SHARE_HEIGHT, WIDTH as SHARE_WIDTH } from './lib/cards.mjs';

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
  '/links',
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
      updated: meta.updated ?? '',
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

// JSON Feed 1.1(https://www.jsonfeed.org/version/1.1/):与 feed.xml / atom.xml
// 同源同一批文章(最新 FEED_SIZE 篇),只是给只认 JSON 的阅读器;
// 字段名按规范走 snake_case,不跟着站点的驼峰
function renderJsonFeed(posts, site, urls) {
  const items = posts.slice(0, FEED_SIZE).map((post) => {
    const date = postDate(post);
    const url = urls.post(post.slug);
    return {
      id: url,
      url,
      title: post.title,
      ...(date ? { date_published: iso(date) } : {}),
      summary: post.excerpt,
      tags: post.tags,
    };
  });

  return `${JSON.stringify(
    {
      version: 'https://jsonfeed.org/version/1.1',
      title: site.name,
      home_page_url: urls.home,
      feed_url: `${urls.home}feed.json`,
      description: site.tagline,
      language: 'zh-CN',
      authors: [
        {
          name: site.author,
          ...(site.github ? { url: site.github } : {}),
        },
      ],
      items,
    },
    null,
    2,
  )}\n`;
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

// ------------------------------------------------------------ 结构化数据

// JSON-LD 用 JSON.stringify 生成,不手拼字符串(转义交给它);
// 摘要里若混进 </script> 会把 script 标签提前截断,所以 < 一律写成 \u003c ——
// 仍是合法 JSON,解析出来的值不变。
function jsonLdScript(data) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return `    <script type="application/ld+json">${json}</script>`;
}

// 作者 / 发布者节点:姓名与主页都取自 site.yml,不编造
function personNode() {
  return {
    '@type': 'Person',
    name: site.author,
    ...(site.github ? { url: site.github } : {}),
  };
}

// 订阅发现:抓取器(以及浏览器地址栏的订阅图标)靠这几个 link 找 feed,
// 地址用绝对路径,feed 阅读器在第三方域名下也能解析
function feedAlternateLinks() {
  return [
    ['application/rss+xml', 'RSS', 'feed.xml'],
    ['application/atom+xml', 'Atom', 'atom.xml'],
    ['application/feed+json', 'JSON Feed', 'feed.json'],
  ].map(
    ([type, label, file]) =>
      `    <link rel="alternate" type="${type}" title="${escapeText(`${site.name} ${label}`)}" href="${escapeText(`${urls.home}${file}`)}" />`,
  );
}

// 每页 head 的增量:canonical / og 全套 / twitter 卡片 / 订阅发现 / JSON-LD
function renderHead({ url, title, description, type, image, jsonLd }) {
  return [
    `    <link rel="canonical" href="${escapeText(url)}" />`,
    `    <meta property="og:site_name" content="${escapeText(site.name)}" />`,
    `    <meta property="og:title" content="${escapeText(title)}" />`,
    `    <meta property="og:description" content="${escapeText(description)}" />`,
    `    <meta property="og:url" content="${escapeText(url)}" />`,
    `    <meta property="og:type" content="${type}" />`,
    `    <meta property="og:image" content="${escapeText(image)}" />`,
    // 分享卡与自动封面都是 1200×630,先报尺寸,抓取器排版时不用等图下载完
    `    <meta property="og:image:width" content="${SHARE_WIDTH}" />`,
    `    <meta property="og:image:height" content="${SHARE_HEIGHT}" />`,
    // Twitter/X 不读 og:*,卡片的四件套要自己写一份(twitter:image 与 og:image 同源)
    '    <meta name="twitter:card" content="summary_large_image" />',
    `    <meta name="twitter:title" content="${escapeText(title)}" />`,
    `    <meta name="twitter:description" content="${escapeText(description)}" />`,
    `    <meta name="twitter:image" content="${escapeText(image)}" />`,
    ...feedAlternateLinks(),
    jsonLdScript(jsonLd),
  ].join('\n');
}

// 幂等:首页是就地改写,模板可能是上一次跑出来的 dist/index.html(里面已经
// 带了注入的 head)。先把上次注入的 canonical / og / twitter / 订阅 link / JSON-LD
// 摘掉,再写本次的,免得重复执行后 head 里堆两份。
function stripInjectedHead(html) {
  return html
    .replace(/\s*<meta\s+[^>]*property="og:[^"]*"[^>]*>/gi, '')
    .replace(/\s*<meta\s+[^>]*name="twitter:[^"]*"[^>]*>/gi, '')
    .replace(/\s*<link\s+[^>]*rel="canonical"[^>]*>/gi, '')
    .replace(
      /\s*<link\s+[^>]*rel="alternate"[^>]*(?:rss|atom|feed)\+(?:xml|json)[^>]*>/gi,
      '',
    )
    .replace(
      /\s*<script\s+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi,
      '',
    );
}

// 只改 <head>:<title> / description / canonical / og:* / 订阅 link / JSON-LD。
// script 标签原样保留:线上打开时由 React 接管,静态 head 只是给抓取器看的。
function renderPageHtml(template, page) {
  const head = renderHead(page);
  return stripInjectedHead(template)
    .replace(
      /<title>[\s\S]*?<\/title>/,
      `<title>${escapeText(page.title)}</title>`,
    )
    .replace(
      /<meta\s+name="description"[^>]*>/i,
      `<meta name="description" content="${escapeText(page.description)}" />`,
    )
    .replace(/\s*<\/head>/, `\n${head}\n  </head>`);
}

// 文章页:head 与 BlogPosting 的字段全部来自 frontmatter 与 site.yml
function postPageRecord(post) {
  const date = postDate(post);
  // 最后更新日期:frontmatter 的 updated(可省)优先,没写就与发布日期相同
  const modified = postDate({ date: post.updated }) ?? date;
  const url = urls.post(post.slug);
  const description = post.excerpt || site.tagline;
  const image = ogImageFor(post.slug).url;

  return {
    file: join(DIST, 'post', `${post.slug}.html`),
    url,
    title: post.title.includes(site.name)
      ? post.title
      : `${post.title} · ${site.name}`,
    description,
    type: 'article',
    image,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description,
      ...(date ? { datePublished: iso(date) } : {}),
      ...(modified ? { dateModified: iso(modified) } : {}),
      author: personNode(),
      publisher: personNode(),
      mainEntityOfPage: url,
      image,
    },
  };
}

// 静态页文案与 src/views/*.tsx 里 usePageMeta 的写法一一对应(改那边时这里
// 一起改,否则标签页/分享卡片里的字和正文页对不上);路径与 sitemap 完全一致
function staticPageRecords(posts, categories) {
  const tagCount = new Set(posts.flatMap((post) => post.tags)).size;
  // 归档页的年份跨度:与 src/data/posts.ts 的 archive() 同规则(取 date 里的年,
  // 文章已按日期倒序,首尾就是最新与最早)
  const years = posts.map((post) => (post.date || '').split(/[- ]/)[0] ?? '');
  const newest = years[0];
  const oldest = years.at(-1);
  const span =
    newest && oldest
      ? newest === oldest
        ? newest
        : `${oldest} — ${newest}`
      : '';
  const countOf = (name) =>
    posts.filter((post) => post.categories.includes(name)).length;

  return [
    {
      path: '/',
      title: `${site.name} · ${site.tagline}`,
      description: site.tagline,
    },
    {
      path: '/tags',
      title: '全部标签',
      description: `共 ${tagCount} 个标签,按使用次数排序,可切换排序方式或按分类过滤。`,
    },
    {
      path: '/categories',
      title: '分类',
      description: `按分类浏览 ${posts.length} 篇文章,共 ${categories.length} 个分类。`,
    },
    {
      path: '/archive',
      title: '归档',
      description: `按时间浏览 ${posts.length} 篇文章${span ? `(${span})` : ''}。`,
    },
    { path: '/search', title: '搜索', description: '站内文章搜索' },
    {
      path: '/about',
      title: '关于本站',
      description: `${site.name} —— ${site.tagline}`,
    },
    {
      // 文案与 src/views/Links.tsx 的 usePageMeta 保持一致(改那边时这里一起改)
      path: '/links',
      title: '友情链接',
      description: '友情链接 —— 记录一些常读的博客与朋友,欢迎交换友链。',
    },
    ...categories.map((name) => ({
      path: `/categories/${name}`,
      title: `${name} · 分类`,
      description: `分类「${name}」下的 ${countOf(name)} 篇文章。`,
    })),
  ];
}

// 静态页落盘位置:目录 + index.html,GH Pages 才会把 /tags 当 200 而不是 404。
// 分类名里的空格 / 中文在 sitemap 里是 %XX 形式,文件系统上是原样字符 ——
// GH Pages 查文件前会先解码 URL,两边正好对得上,这里不要再编一次码。
function staticFileFor(path) {
  if (path === '/') return INDEX_HTML;
  return join(DIST, ...path.split('/').filter(Boolean), 'index.html');
}

// 静态页:WebSite + Person(站点没有独立作者页,作者与发布者共用同一个节点)
function staticPageRecord(page) {
  return {
    file: staticFileFor(page.path),
    url: urls.page(page.path),
    title: page.title.includes(site.name)
      ? page.title
      : `${page.title} · ${site.name}`,
    description: page.description,
    type: 'website',
    image: defaultShareImage(),
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: site.name,
      url: urls.home,
      description: site.tagline,
      author: personNode(),
      publisher: personNode(),
    },
  };
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

const started = Date.now();
const template = readFileSync(INDEX_HTML, 'utf8');
mkdirSync(DIST, { recursive: true });

writeFileSync(join(DIST, 'feed.xml'), renderRss(posts, site, urls), 'utf8');
writeFileSync(join(DIST, 'atom.xml'), renderAtom(posts, site, urls), 'utf8');
writeFileSync(
  join(DIST, 'feed.json'),
  renderJsonFeed(posts, site, urls),
  'utf8',
);
writeFileSync(
  join(DIST, 'sitemap.xml'),
  renderSitemap(posts, urls, categories),
  'utf8',
);
writeFileSync(join(DIST, 'robots.txt'), renderRobots(urls), 'utf8');

// 静态页(含首页,就地改写 dist/index.html)与文章页走同一段落盘逻辑
const pages = [
  ...staticPageRecords(posts, categories).map(staticPageRecord),
  ...posts.map(postPageRecord),
];

let failed = 0;
for (const page of pages) {
  try {
    // slug / 分类名带子目录时要先建目录
    mkdirSync(dirname(page.file), { recursive: true });
    writeFileSync(page.file, renderPageHtml(template, page), 'utf8');
  } catch (err) {
    // 不吞错误:报出是哪一页失败,收尾时整体置非零退出码,让 CI 直接红
    failed += 1;
    console.error(`[build-static] 生成失败 ${page.url}:${err.message}`);
  }
}

// SPA 兜底:GitHub Pages 对不存在的路径会返回 404.html,让前端路由接管。
// 放在这里(而不是流水线里 cp 一下),本地 build 出来的 dist 也是完整的。
copyFileSync(join(DIST, 'index.html'), join(DIST, '404.html'));

const fallback = posts.filter((post) => !ogImageFor(post.slug).fromOg).length;
const addressCount = STATIC_PAGES.length + categories.length + posts.length;
const pageCount = pages.length - posts.length;
const seconds = ((Date.now() - started) / 1000).toFixed(2);

console.log(`[build-static] 站点地址 ${urls.home}`);
console.log(
  `[build-static] feed.xml / atom.xml / feed.json 各 ${Math.min(posts.length, FEED_SIZE)} 篇`,
);
console.log(`[build-static] sitemap.xml ${addressCount} 个地址`);
console.log('[build-static] robots.txt');
console.log('[build-static] 404.html(SPA 兜底)');
console.log(
  `[build-static] 静态页 ${pageCount} 个(含首页,head 带 JSON-LD 与订阅 link)→ dist/<路径>/index.html`,
);
console.log(
  `[build-static] 文章 ${posts.length} 篇 → dist/post/<slug>.html` +
    (fallback > 0 ? `(其中 ${fallback} 篇没有 og 图,用默认分享图)` : ''),
);
console.log(`[build-static] 用时 ${seconds}s`);

if (failed > 0) {
  console.error(`[build-static] ${failed} 个页面生成失败,产物不完整`);
  process.exitCode = 1;
}
