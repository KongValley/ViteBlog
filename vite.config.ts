import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { parse } from 'yaml';

const root = dirname(fileURLToPath(import.meta.url));

// 可用主题:与 src/themes/ 下的目录一一对应
const THEMES = ['pixel', 'swiss', 'editorial'] as const;
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

// base 必须与 GitHub 仓库名一致(GitHub Pages 会部署在 /仓库名/ 子路径下)
// 如果仓库改名,记得同步修改这里
export default defineConfig({
  base: '/ViteBlog/',
  plugins: [react(), siteConfig()],
});
