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

// 音乐挂件(site.yml 的 music 段;不填就不显示播放器)
export interface MusicConfig {
  /** 平台:tencent(QQ音乐)/ netease(网易云)/ kugou / kuwo / baidu … */
  server: string;
  /** 取歌方式:song(单曲)/ playlist(歌单) */
  type: string;
  /** song 填歌曲 ID,playlist 填歌单 ID(QQ 音乐页面 URL 里那串) */
  id: string;
  /** Meting API 模板,必须带 :server / :type / :id 三个占位符 */
  api: string;
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
  music?: MusicConfig;
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

// 公共 Meting 实例:接口来自 MetingJS 同款(https://github.com/metowolf/Meting-API)
// 自建后把 site.yml 的 music.api 换掉即可
const DEFAULT_METING_API =
  'https://api.injahow.cn/meting/?server=:server&type=:type&id=:id';

// yml 里的音乐配置:歌曲 id 没填就当没配(整张卡片不渲染);
// api 模板缺占位符时打回默认实例,免得写错了整页没声音还看不出原因
function normalizeMusic(raw: unknown): MusicConfig | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const item = raw as Record<string, unknown>;

  // 歌单 id 全是数字,YAML 会把它解析成 number(用户不会特意加引号),所以两种都收
  const id =
    typeof item.id === 'number'
      ? String(item.id)
      : typeof item.id === 'string'
        ? item.id.trim()
        : '';
  if (!id) return undefined;

  const server =
    typeof item.server === 'string' && item.server.trim() !== ''
      ? item.server.trim()
      : 'tencent';
  // 目前只支持单曲和歌单两种取法,写别的按单曲处理(接口也只认这两类)
  const type =
    typeof item.type === 'string' && item.type.trim() === 'playlist'
      ? 'playlist'
      : 'song';
  const api = typeof item.api === 'string' ? item.api.trim() : '';
  if (!api) return { server, type, id, api: DEFAULT_METING_API };

  const placeholders = [':server', ':type', ':id'];
  if (placeholders.some((placeholder) => !api.includes(placeholder))) {
    console.warn(
      `[site.yml] music.api 缺少 ${placeholders.join(' / ')} 占位符,已回退到默认 Meting 接口`,
    );
    return { server, type, id, api: DEFAULT_METING_API };
  }
  return { server, type, id, api };
}

export const site: Site = {
  ...defaults,
  ...config,
  theme: normalizeTheme(config.theme),
  social: normalizeSocial(config.social),
  music: normalizeMusic(config.music),
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
