// 站点配置统一来自项目根目录的 site.yml(由 vite.config.ts 注入)
// 这里只做默认值兜底:yml 里省略的字段会自动补全,配置文件可以写得很精简
import config from 'virtual:site-config';

// 可用主题:与 vite.config.ts 及 src/themes/ 目录保持一致
export const THEME_NAMES = [
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
export type ThemeName = (typeof THEME_NAMES)[number];

// 社交账号(「关于本站」页的联系卡片用)
export interface SocialLink {
  name: string;
  handle: string;
  url: string;
}

export interface Site {
  name: string;
  tagline: string;
  author: string;
  since: number;
  github: string;
  githubUser: string;
  avatar: string;
  theme: ThemeName;
  social: SocialLink[];
}

const defaults: Site = {
  name: 'ViteBlog',
  tagline: '记录学习与生活',
  author: 'Blogger',
  since: new Date().getFullYear(),
  github: '',
  githubUser: '',
  avatar: '',
  theme: 'pixel',
  social: [],
};

// yml 里写错主题名时兜底回像素风(vite 插件在构建期也会给出明确报错)
function normalizeTheme(raw: unknown): ThemeName {
  return typeof raw === 'string' &&
    (THEME_NAMES as readonly string[]).includes(raw)
    ? (raw as ThemeName)
    : 'pixel';
}

// yml 里的社交账号列表:丢掉 name 或 url 没填的项,顺序即展示顺序
function normalizeSocial(raw: unknown): SocialLink[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null,
    )
    .map((item) => ({
      name: typeof item.name === 'string' ? item.name.trim() : '',
      handle: typeof item.handle === 'string' ? item.handle.trim() : '',
      url: typeof item.url === 'string' ? item.url.trim() : '',
    }))
    .filter((item) => item.name !== '' && item.url !== '');
}

export const site: Site = {
  ...defaults,
  ...config,
  theme: normalizeTheme(config.theme),
  social: normalizeSocial(config.social),
};

// 未配置仓库地址时,用 GitHub 用户名拼一个
if (!site.github && site.githubUser) {
  site.github = `https://github.com/${site.githubUser}`;
}

// 未配置头像时,自动使用 GitHub 头像(60px 小图放大呈现像素颗粒感)
if (!site.avatar && site.githubUser) {
  site.avatar = `https://github.com/${site.githubUser}.png?size=60`;
}

// 以 / 开头的本地头像路径(public/ 目录下的文件)自动补全站点子路径(base)
if (site.avatar.startsWith('/')) {
  site.avatar = import.meta.env.BASE_URL.replace(/\/$/, '') + site.avatar;
}
