// 站点配置统一来自项目根目录的 site.yml(由 vite.config.ts 注入)
// 这里只做默认值兜底:yml 里省略的字段会自动补全,配置文件可以写得很精简
import config from 'virtual:site-config'

export interface Site {
  name: string
  tagline: string
  author: string
  since: number
  github: string
  githubUser: string
  avatar: string
}

const defaults: Site = {
  name: 'ViteBlog',
  tagline: '记录学习与生活',
  author: 'Blogger',
  since: new Date().getFullYear(),
  github: '',
  githubUser: '',
  avatar: '',
}

export const site: Site = { ...defaults, ...config }

// 未配置仓库地址时,用 GitHub 用户名拼一个
if (!site.github && site.githubUser) {
  site.github = `https://github.com/${site.githubUser}`
}

// 未配置头像时,自动使用 GitHub 头像(60px 小图放大呈现像素颗粒感)
if (!site.avatar && site.githubUser) {
  site.avatar = `https://github.com/${site.githubUser}.png?size=60`
}

// 以 / 开头的本地头像路径(public/ 目录下的文件)自动补全站点子路径(base)
if (site.avatar.startsWith('/')) {
  site.avatar = import.meta.env.BASE_URL.replace(/\/$/, '') + site.avatar
}
