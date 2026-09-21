import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { parse } from 'yaml';
import { countWords, parseFrontmatter } from './src/data/frontmatter';

const root = dirname(fileURLToPath(import.meta.url));

// 可用主题:与 src/themes/ 下的目录一一对应
const THEMES = [
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
] as const;
type Theme = (typeof THEMES)[number];

// 把根目录的 site.yml 注入为虚拟模块:
//   virtual:site-config → yml 解析结果(站点信息)
//   virtual:site-theme  → 只 import 选中的那套主题(样式 + 字体)
// 构建时只会打包被选中的主题,三套主题互不混装
function siteConfig(): Plugin {
  const file = resolve(root, 'site.yml');

  const readSiteYml = (): Record<string, unknown> => {
    try {
      return parse(readFileSync(file, 'utf8')) ?? {};
    } catch (err) {
      throw new Error(
        `site.yml 配置文件解析失败,请检查格式(注意冒号后要有空格):${(err as Error).message}`,
      );
    }
  };

  const readTheme = (): Theme => {
    const raw = readSiteYml().theme;
    if (raw === undefined || raw === null || raw === '') return 'pixel';
    if (
      typeof raw === 'string' &&
      (THEMES as readonly string[]).includes(raw)
    ) {
      return raw as Theme;
    }
    throw new Error(
      `site.yml 的 theme 无效:${JSON.stringify(raw)},可选值为 ${THEMES.join(' / ')}`,
    );
  };

  return {
    name: 'site-config-yml',
    resolveId(id) {
      if (id === 'virtual:site-config') return '\0site-config';
      if (id === 'virtual:site-theme') return '\0site-theme';
    },
    load(id) {
      if (id === '\0site-config') {
        this.addWatchFile(file); // yml 改动时触发本地热更新
        return `export default ${JSON.stringify(readSiteYml())}`;
      }
      if (id === '\0site-theme') {
        this.addWatchFile(file); // 改 theme 字段时重新解析主题入口
        return `import ${JSON.stringify(`/src/themes/${readTheme()}/index.ts`)}`;
      }
    },
  };
}

// 把 src/posts 下的文章元信息扫成虚拟模块:
//   virtual:posts-index → [{ slug, title, date, tags, categories, excerpt, cover, words, minutes }]
// 只注入元信息,正文由 src/data/posts.ts 按需动态 import(?raw),这样首页不必
// 把 51 篇文章的原文一起打包进来;新增/删除文章时目录也在监听范围内。
function postsIndex(): Plugin {
  const dir = resolve(root, 'src', 'posts');
  const virtualId = '\0posts-index';

  const walk = (path: string): string[] => {
    const entries = readdirSync(path, { withFileTypes: true });
    return entries.flatMap((entry) => {
      const full = join(path, entry.name);
      if (entry.isDirectory()) return walk(full);
      return entry.name.endsWith('.md') ? [full] : [];
    });
  };

  const build = (): string => {
    const list = walk(dir).map((file) => {
      const raw = readFileSync(file, 'utf8');
      const { meta, content } = parseFrontmatter(raw);
      const words = countWords(content);
      return {
        slug: relative(dir, file).replace(/\\/g, '/').replace(/\.md$/, ''),
        title: meta.title ?? '未命名文章',
        date: meta.date ?? '',
        tags: meta.tags ?? [],
        categories: meta.categories ?? [],
        excerpt: meta.excerpt ?? '',
        cover: meta.cover ?? '',
        words,
        // 阅读时长:至少 1 分钟,免得短笔记显示 0
        minutes: Math.max(1, Math.round(words / 400)),
      };
    });
    list.sort(
      (a, b) =>
        (a.date < b.date ? 1 : a.date > b.date ? -1 : 0) ||
        (a.slug < b.slug ? -1 : 1),
    );
    return JSON.stringify(list);
  };

  return {
    name: 'posts-index',
    resolveId(id) {
      if (id === 'virtual:posts-index') return virtualId;
    },
    load(id) {
      if (id !== virtualId) return;
      return `export default ${build()}`;
    },
    configureServer(server) {
      // 目录级监听:新文章是 add、删文章是 unlink,改 frontmatter 是 change
      server.watcher.add(dir);
      const refresh = (file: string) => {
        if (!file.startsWith(dir) || !file.endsWith('.md')) return;
        const mod = server.moduleGraph.getModuleById(virtualId);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', refresh);
      server.watcher.on('unlink', refresh);
      server.watcher.on('change', refresh);
    },
  };
}

// 把构建期生成的图片清单注入为虚拟模块:
//   virtual:images-manifest → { "/images/foo.jpg": { width, height, variants: [{ w, src }] } }
// 清单由 scripts/optimize-images.mjs 产出;文件不存在(还没跑脚本)就注入空对象,
// src/data/images.ts 的 hasVariants 于是全返回 false,渲染器自然降级成普通 <img>。
function imagesManifest(): Plugin {
  const file = resolve(root, 'public', 'images', 'images.manifest.json');
  const virtualId = '\0images-manifest';

  const read = (): string => {
    try {
      return readFileSync(file, 'utf8');
    } catch {
      return '{}';
    }
  };

  return {
    name: 'images-manifest',
    resolveId(id) {
      if (id === 'virtual:images-manifest') return virtualId;
    },
    load(id) {
      if (id !== virtualId) return;
      this.addWatchFile(file); // 重新生成清单后热更新
      return `export default ${read()}`;
    },
    configureServer(server) {
      // manifest 不在 src 下,靠 addWatchFile 不足以让 dev server 刷新
      server.watcher.add(file);
      const refresh = (changed: string) => {
        if (resolve(changed) !== file) return;
        const mod = server.moduleGraph.getModuleById(virtualId);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', refresh);
      server.watcher.on('change', refresh);
    },
  };
}

// base 必须与 GitHub 仓库名一致(GitHub Pages 会部署在 /仓库名/ 子路径下)
// 如果仓库改名,记得同步修改这里
export default defineConfig({
  base: '/ViteBlog/',
  plugins: [react(), siteConfig(), postsIndex(), imagesManifest()],
});
