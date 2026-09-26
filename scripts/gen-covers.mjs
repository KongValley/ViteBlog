// 用图像生成模型给文章做**像素风封面**(风格与站点默认像素风一致,但每篇的图案按主题生成)。
//
//   IMAGE_API_KEY=sk-... npm run cover:ai -- <slug>          # 单篇打样
//   IMAGE_API_KEY=sk-... npm run cover:ai -- --all           # 全站批量(每篇一次请求,注意计费)
//   npm run cover:ai -- --all --dry-run                      # 不需要 key:只打印将要发出的请求体
//
// 走 OpenAI 兼容的**图像生成**接口:POST {IMAGE_BASE_URL}/images/generations
// (实测确认:模型页「调用示例」里的 chat/completions 只是通用模板 —— 真出图走 images 路由,
//  回包形如 { data: [{ url|b64_json, width, height, revised_prompt }] }。)
// 默认网关 https://puppyrouter.com/v1、默认模型 gpt-image-2.5-sunburst;
// key 支持放进 .env.local(已在 .gitignore 里,不进 shell 历史):
//
//   IMAGE_API_KEY=sk-...                      # 网关「令牌」页创建
//   IMAGE_BASE_URL=https://puppyrouter.com/v1 # 可选:换别家 OpenAI 兼容网关时覆盖
//
// 可选参数:
//   --model gpt-image-2.5-sunburst   默认;也可用 gpt-image-2.5-flare / gpt-image-2
//   --size 1536x1024                 实测网关接受;裁成 1200×630 前留了裁切余量,也可 1024x1024
//   --quality <预设>                  按网关文档透传,默认不发送
//   --style "额外的风格补充"           追加到提示词尾部
//   --concurrency N / --delay MS     批量的并发与请求间隔(默认 1 并发、每次间隔 2s)
//
// 和千问时代的差异:模型没有 seed / negative_prompt / prompt_extend 参数 ——
// 「换一张」直接重跑(每次结果都不同),禁字等要求以 Avoid 段写在提示词里;
// 旧的 --index(换 seed)已移除,传了会直接报错提醒。
//
// 生成结果下载后裁成 1200×630,存到 public/images/covers/<slug>.jpg 并回填 frontmatter 的 cover。
// 之所以落在 public/images/:构建期的 webp 变体管线只认清单里的本地图,而且分享长图是同源取图
// (远程图会被跨域标脏、导不出来)。

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const POSTS_DIR = join(ROOT, 'src', 'posts');
const COVER_DIR = join(ROOT, 'public', 'images', 'covers');
const WIDTH = 1200;
const HEIGHT = 630;
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 1);

// 支持把 key 放进 .env.local(已被 .gitignore 的 *.local 覆盖),免得写进 shell 历史
for (const envFile of ['.env.local', '.env']) {
  const path = join(ROOT, envFile);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  }
}

const apiKey = process.env.IMAGE_API_KEY ?? '';
/** 网关地址:默认走 puppyrouter,换别家 OpenAI 兼容网关时用 IMAGE_BASE_URL 覆盖 */
const DEFAULT_BASE_URL = 'https://puppyrouter.com/v1';
const rawBase = process.env.IMAGE_BASE_URL || DEFAULT_BASE_URL;

/** 地址整理:补 https://、去掉结尾斜杠;完整 URL 原样用 */
function normalizeBase(raw) {
  const value = raw.trim().replace(/\/+$/, '');
  if (!value) return '';
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

const baseUrl = normalizeBase(rawBase);

/** 接口报 404 之类多半是地址/路径不对,统一给一句能照着做的提示 */
const BASE_HINT = [
  `接口地址:${baseUrl}/images/generations`,
  '默认 https://puppyrouter.com/v1;换别家网关把完整地址填进 .env.local 的 IMAGE_BASE_URL。',
].join('\n');

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

/**
 * 带值的选项:扫描位置参数时要连它们的值一起跳过,
 * 否则 `--all --concurrency 3` 会把 3 当成 slug。
 * 注意别改动 args —— 下面的 option() 还要从里面取值。
 */
const VALUE_OPTIONS = new Set([
  '--model',
  '--size',
  '--quality',
  '--style',
  '--index',
  '--concurrency',
  '--delay',
]);
const positional = [];
for (let at = 0; at < args.length; at += 1) {
  const arg = args[at];
  if (arg.startsWith('--')) {
    if (VALUE_OPTIONS.has(arg)) at += 1;
    continue;
  }
  if (arg !== 'all') positional.push(arg);
}
const [slug] = positional;

const all = flag('all');
const dryRun = flag('dry-run');

const model = option('model', 'gpt-image-2.5-sunburst');
const size = option('size', '1536x1024');
const quality = option('quality', '');
const style = option('style', '');

// gpt-image 系列没有 seed:旧的 --index 换 seed 玩法失效。这里给一句明确提示,
// 免得它的值被当成 slug 报出莫名其妙的错。
if (flag('index')) {
  console.error(
    'gpt-image 不支持 seed,--index 已移除;想要新的一张直接重跑(每次结果都不同)。',
  );
  process.exit(1);
}

/** 请求节奏:默认串行 + 每次间隔 2s,免得撞上账号的限速(实测 2 并发很快 429) */
const DELAY = Math.max(0, Number(option('delay', '2000')) || 2000);
let nextAllowed = 0;
async function pace() {
  const now = Date.now();
  const wait = Math.max(0, nextAllowed - now);
  nextAllowed = Math.max(now, nextAllowed) + DELAY;
  if (wait > 0) await sleep(wait);
}

if (!slug && !all) {
  console.error(
    '用法:IMAGE_API_KEY=sk-... node scripts/gen-covers.mjs <slug>|--all [--dry-run] [--model …] [--size …] [--quality …]',
  );
  process.exit(1);
}
if (!apiKey && !dryRun) {
  console.error(
    '缺少 IMAGE_API_KEY(网关「令牌」页创建后填进 .env.local 的 IMAGE_API_KEY)。\n' +
      '  只想看请求体可以用 --dry-run,不需要 key。',
  );
  process.exit(1);
}

// frontmatter 的 cover 会原样进 <img src>,必须自带部署 base(正文图片则由 renderMarkdown 补)
const BASE = (() => {
  const matched = readFileSync(join(ROOT, 'vite.config.ts'), 'utf8').match(
    /\bbase:\s*'([^']*)'/,
  );
  const value = matched?.[1] ?? '/';
  return value.endsWith('/') ? value : `${value}/`;
})();

/** 中文标签 → 英文主题词:提示词里中英都给,模型两边都吃 */
const TOPIC_MAP = {
  工具: 'developer tooling',
  入门: 'learning programming',
  基础: 'programming fundamentals',
  进阶: 'advanced software engineering',
  股市: 'stock market',
  股票: 'stock market',
  记录: 'keeping notes',
  生活: 'everyday life',
  数据库: 'database',
  部署: 'deployment servers',
  性能: 'performance',
  闭包: 'functions and scopes',
  类型: 'type systems',
  图标: 'icon design',
  'AI 编程': 'AI coding assistant',
  'Build Blog': 'blog building',
  技术指标: 'technical analysis charts',
  股市基础技能: 'stock market charts',
  数据可视化: 'data visualization',
  网络: 'computer network',
  安全: 'cyber security',
  测试: 'software testing',
  重构: 'code refactoring',
  算法: 'algorithms',
};

function listPosts() {
  const entries = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.md')) entries.push(full);
    }
  };
  walk(POSTS_DIR);
  return entries.sort();
}

const slugOf = (file) =>
  relative(POSTS_DIR, file).replace(/\\/g, '/').replace(/\.md$/, '');

/** 极简 frontmatter 读取(只取 title / tags / categories,不引运行时代码) */
function readMeta(file) {
  const raw = readFileSync(file, 'utf8');
  const block = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const meta = { title: '', tags: [], categories: [] };
  if (!block) return meta;
  let listKey = '';
  for (const line of block[1].split(/\r?\n/)) {
    const listItem = line.match(/^\s+-\s+(.+)$/);
    if (listItem && listKey) {
      meta[listKey].push(listItem[1].trim());
      continue;
    }
    const kv = line.match(/^([a-zA-Z]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, value] = kv;
    if (key === 'title') meta.title = value.trim();
    if (key === 'tags' || key === 'categories') {
      listKey = key;
      if (value.trim())
        meta[key] = value
          .split(/[,，]/)
          .map((v) => v.trim())
          .filter(Boolean);
    }
  }
  return meta;
}

/** 文章 → 主题短语(英文词 + 中文原标题,便于中文模型理解) */
function topicOf(postSlug, meta) {
  const words = postSlug
    .split('/')
    .pop()
    .split('-')
    .map((word) => word.toLowerCase())
    .filter(
      (word) =>
        /^[a-z]{3,}$/.test(word) &&
        !['the', 'and', 'for', 'with', 'from', 'guide', 'notes'].includes(word),
    );

  const mapped = [...(meta.tags ?? []), ...(meta.categories ?? [])]
    .map((tag) => TOPIC_MAP[tag] ?? (/^[\x20-\x7e]+$/.test(tag) ? tag : ''))
    .filter(Boolean);

  return [...new Set([...mapped, ...words].map((v) => v.toLowerCase()))]
    .slice(0, 5)
    .join(', ');
}

/**
 * 无字场景表(scripts/cover-scenes.json,slug → 纯视觉描述)。
 * 实测:提示词里出现 "javascript"/"modules" 这类技术词,模型就会把它们画成标题字;
 * 换成「木箱/管道/森林」这类只有实物的描述后,出图基本不再带字。
 */
const SCENES = (() => {
  const file = join(ROOT, 'scripts', 'cover-scenes.json');
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
})();

/** 固定的像素风模板 + 该文主题;明确禁止文字,模型很爱往图上写字 */
function buildPrompt(postSlug, meta) {
  const topic = SCENES[postSlug] || topicOf(postSlug, meta) || 'programming';
  return [
    // 方向:像素游戏「场景」而不是居中徽章 —— 有远近层次、有地面、小角色在做事;
    // 主角统一是「胖橘」:圆滚滚的橘猫,场景里的其他动物演员都换成它,道具和动作照旧
    'Retro 16-bit pixel art game scene, like a screenshot of a SNES-era platformer or RPG.',
    'A full scene with depth: a far background layer of pixel scenery, a mid layer of objects,',
    'and a ground or platform layer across the foreground; the protagonist is a single chubby',
    'orange tabby cat (round belly, ginger stripes, cream muzzle and paws) acting in the middle',
    'of the scene with a few props around it.',
    'Chunky visible pixels, hard edges, no anti-aliasing, limited retro palette:',
    'deep navy background (#0f0e17), NES red (#e43d44), warm gold (#f8b800), cyan accents (#22d3ee).',
    'Wide horizontal composition, camera slightly above the ground, empty space near the edges',
    'so the middle of the picture reads clearly when it is cropped into a small card.',
    'ABSOLUTELY NO TEXT: no letters, no characters, no words, no numbers, no captions, no titles,',
    'no labels, no signage, no interface panels, no code blocks, no HUD, no health bars, no menus.',
    `Scene (depict it as a wordless pixel game scene; keep the props and action, but recast the`,
    `animal actor as the chubby orange cat — the cat is the hero): ${topic}.`,
    `Avoid: ${AVOID}.`,
    style,
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * 禁止项:这套接口没有 negative_prompt 参数,改以 "Avoid: …" 附在正向提示词末尾
 * (千问时代的独立 negative_prompt 字段已随引擎一起去掉)。
 */
const AVOID = [
  'text, letters, words, numbers, glyphs, typography, title, caption, subtitle, signage,',
  'label, code block, terminal window, UI screenshot, interface panel, watermark, signature, logo,',
  'blurry, low quality, jpeg artifacts, photo, 3d render, gradient mesh, anti-aliased edges',
].join(' ');

/** 限速与临时故障等一会儿再试就好;参数错误(400/401 等)直接抛 */
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 6;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** 从图像接口回包里取图片:优先 b64_json,其次 url(网关默认按 response_format=url 回地址) */
function pickImage(payload) {
  const entry = payload.data?.[0];
  if (entry?.b64_json) return { b64: entry.b64_json };
  if (entry?.url) return { url: entry.url };
  return null;
}

/** 调一次图像生成接口,返回图片二进制(含限速退避重试) */
async function generate(prompt) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await generateOnce(prompt);
    } catch (error) {
      if (!error.retryable || attempt >= MAX_RETRIES) throw error;
      // 4s、8s、16s…最多 90s,加一点抖动避免同时重试
      const wait = Math.min(90_000, 4000 * 2 ** attempt) + Math.random() * 1500;
      console.log(
        `  · ${error.message.slice(0, 60)}(第 ${attempt + 1}/${MAX_RETRIES} 次重试,${Math.round(wait / 1000)}s 后)`,
      );
      await sleep(wait);
    }
  }
}

async function generateOnce(prompt) {
  await pace();
  const body = {
    model,
    prompt,
    size,
    n: 1,
    response_format: 'url',
  };
  // 网关文档里的 quality 预设:默认不发,显式给了才带上
  if (quality) body.quality = quality;

  let response;
  try {
    response = await fetch(`${baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    // DNS / TLS 直接失败:多半是地址填错了
    const failure = new Error(
      `请求发不出去(${error?.message ?? error})。\n${BASE_HINT}`,
    );
    failure.retryable = true;
    throw failure;
  }

  if (!response.ok) {
    const text = (await response.text()).slice(0, 300);
    const hint = response.status === 404 ? `\n${BASE_HINT}` : '';
    // 分组里没有渠道 / 模型不存在:退避重试也白搭,直接失败并给出可照做的提示
    const noChannel =
      /no channel|channel[_ ]?(not[_ ]?found|failed)|可用渠道|model_not_found/i.test(
        text,
      );
    const channelHint = noChannel
      ? '\n提示:网关报告该模型在当前令牌分组下没有可用渠道 —— 换有权限的令牌/分组,或用 --model 换模型。'
      : '';
    const failure = new Error(
      `接口返回 HTTP ${response.status}:${text}${hint}${channelHint}`,
    );
    failure.retryable = RETRYABLE_STATUS.has(response.status) && !noChannel;
    throw failure;
  }
  const payload = await response.json();
  const picked = pickImage(payload);
  if (!picked) {
    throw new Error(
      `回包里没找到图片(markdown 图片 / URL / base64 都没有):${JSON.stringify(payload).slice(0, 300)}`,
    );
  }
  if (picked.b64) return Buffer.from(picked.b64, 'base64');
  // URL 一般是临时地址,拿到就马上下载
  const image = await fetch(picked.url);
  if (!image.ok) {
    const failure = new Error(`下载生成结果失败:HTTP ${image.status}`);
    failure.retryable = RETRYABLE_STATUS.has(image.status);
    throw failure;
  }
  return Buffer.from(await image.arrayBuffer());
}

/** 裁成 1200×630 封面 */
async function saveCover(postSlug, buffer) {
  mkdirSync(COVER_DIR, { recursive: true });
  const file = join(COVER_DIR, `${postSlug.replace(/\//g, '__')}.jpg`);
  const info = await sharp(buffer)
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(file);
  return { file, info };
}

/** 把 cover 写回 frontmatter:已有就替换,没有就插在 date 行后面 */
function writeCoverField(file, coverUrl) {
  const raw = readFileSync(file, 'utf8');
  const block = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!block) throw new Error('这篇文章没有 frontmatter');
  const lines = block[1].split(/\r?\n/);
  const coverLine = `cover: ${coverUrl}`;
  const existing = lines.findIndex((line) => line.startsWith('cover:'));
  if (existing >= 0) lines[existing] = coverLine;
  else {
    const dateAt = lines.findIndex((line) => line.startsWith('date:'));
    lines.splice(dateAt >= 0 ? dateAt + 1 : lines.length, 0, coverLine);
  }
  writeFileSync(file, raw.replace(block[1], lines.join('\n')));
}

async function mapWithLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const at = cursor;
        cursor += 1;
        results[at] = await worker(items[at]);
      }
    }),
  );
  return results;
}

async function one(file) {
  const postSlug = slugOf(file);
  const meta = readMeta(file);
  const prompt = buildPrompt(postSlug, meta);
  const request = {
    url: `${baseUrl}/images/generations`,
    model,
    size,
    response_format: 'url',
    prompt,
  };
  if (quality) request.quality = quality;
  if (dryRun) return { slug: postSlug, ok: true, request };

  try {
    const buffer = await generate(prompt);
    const { info } = await saveCover(postSlug, buffer);
    writeCoverField(
      file,
      `${BASE}images/covers/${postSlug.replace(/\//g, '__')}.jpg`,
    );
    return { slug: postSlug, ok: true, bytes: info.size, request };
  } catch (error) {
    return { slug: postSlug, ok: false, reason: error.message, request };
  }
}

if (rawBase && rawBase.trim() !== baseUrl) {
  console.log(`接口地址已按你填的补全:${rawBase.trim()} → ${baseUrl}`);
}
console.log(
  `模型 ${model} / 尺寸 ${size} / 接口 ${baseUrl}${dryRun ? '(dry-run)' : ''}`,
);

// ---- 单篇 ----
// 生成之后不要用 process.exit:Windows 上 undici 的连接还挂在异步句柄里,
// 会和 process.exit 互踩(Node/libuv 断言,退出码 9)。统一设 exitCode,让进程自然退出。
if (slug) {
  const file = join(POSTS_DIR, `${slug}.md`);
  if (!existsSync(file)) {
    console.error(`找不到文章:src/posts/${slug}.md`);
    process.exitCode = 1;
  } else {
    const result = await one(file);
    if (dryRun) {
      console.log(
        `\n请求体(${slug}):\n${JSON.stringify(result.request, null, 2)}`,
      );
    } else if (!result.ok) {
      console.error(`生成失败:${result.reason}`);
      process.exitCode = 1;
    } else {
      console.log(
        `\n封面已写入:public/images/covers/${slug.replace(/\//g, '__')}.jpg(${(result.bytes / 1024).toFixed(0)} KB)`,
      );
    }
  }
} else {
  // ---- 批量 ----
  const files = listPosts();
  const jobs = Math.max(
    1,
    Number(option('concurrency', String(CONCURRENCY))) || CONCURRENCY,
  );
  console.log(
    `批量:${files.length} 篇(并发 ${jobs},请求间隔 ${DELAY}ms;限速会自动退避重试)\n`,
  );
  const results = await mapWithLimit(files, jobs, one);

  const ok = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  if (dryRun) {
    for (const item of ok) {
      console.log(
        `  ${item.slug}\n    ${item.request.prompt.slice(0, 130)}…\n`,
      );
    }
  }
  for (const item of failed) console.log(`  ✗ ${item.slug}:${item.reason}`);

  const total = ok.reduce((sum, item) => sum + (item.bytes ?? 0), 0);
  console.log(
    `\n完成:成功 ${ok.length} 篇,失败 ${failed.length} 篇` +
      (dryRun
        ? '(dry-run,未调用接口)'
        : `,封面合计 ${(total / 1024 / 1024).toFixed(1)} MB`),
  );
  if (!dryRun) {
    console.log(
      '不满意的单篇可以重打:<slug> 直接重跑换一张,或 --style "夜间城市电路板" 加要求',
    );
  }
  if (failed.length > 0) process.exitCode = 1;
}
