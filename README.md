# ViteBlog

基于 **React + Vite + TypeScript 7** 的个人博客,托管在 GitHub Pages 上,通过 GitHub Actions 自动构建部署。UI 为红白机像素风。

## 本地开发

```bash
npm install     # 安装依赖
npm run dev     # 启动开发服务器
npm run build   # 类型检查(tsc)+ 构建生产版本到 dist/
npm run preview # 本地预览构建产物
npm run lint    # Biome 检查(格式 + lint),CI/提交前跑这个
npm run lint:fix # Biome 自动修复可安全修复的问题
npm run format  # 仅用 Biome 格式化代码
```

项目使用 **Biome** 做代码检查与格式化(配置见根目录 `biome.json`),
规则:2 空格缩进、单引号、导入自动排序;`public/` 静态资源不参与检查。
个别确有理由的告警用 `// biome-ignore lint/规则名: 原因` 行内抑制。

项目使用 **TypeScript 7**(原生 tsc):所有数据层(`src/data/*.ts`)有完整类型定义,
构建前会先跑 `tsc --noEmit` 类型检查,CI 上有类型错误会直接部署失败。

## 如何写文章

在 `src/posts/` 下新建一个 `.md` 文件即可,可以直接放进子目录。链接 slug 是相对 `src/posts/` 的路径(如 `notes/my-first-post.md` → `/post/notes/my-first-post`)。

```markdown
---
title: 文章标题
date: 2026-09-15        # YYYY-MM-DD,卡片上显示的发布日期
tags:
  - React
  - 随笔
categories:
  - Build Blog
excerpt: 一两句话摘要,显示在首页卡片上。
---

正文用 Markdown 编写,支持代码块、表格、引用等。
```

首页列表按 Markdown 元信息里的 **`date` 字段**倒序排列,日期越新的文章越靠前。

保存后无需改任何代码,首页自动出现新文章。

## 站点配置

所有站点信息统一在根目录的 **`site.yml`** 里修改,不用碰任何代码:

```yaml
name: ViteBlog            # 博客名称
tagline: 记录学习与生活     # 一句话简介
author: KongZhipeng       # 你的名字
since: 2026               # 建站年份
githubUser: KongValley    # GitHub 用户名(名片/头像/链接)
github: https://github.com/KongValley/ViteBlog   # 仓库地址(可省略,自动用用户名拼)
avatar: https://github.com/KongValley.png?size=60 # 头像(可省略,默认 GitHub 头像)
```

本地 `npm run dev` 时改 yml 会自动热更新;push 到 GitHub 后自动重新部署。
省略 `github` / `avatar` 字段时会根据 `githubUser` 自动生成,所以最小配置只需 5 行。

## 主题

站点内置三套**完全独立**的主题,通过根目录 `site.yml` 里的 `theme` 字段指定(本地改完自动热更新,push 后自动重新部署):

```yaml
theme: pixel   # 三选一:pixel / swiss / editorial
```

| theme | 风格 |
| --- | --- |
| `pixel`(默认) | 红白机像素风:游戏机名片、像素字体、CRT 扫描线 |
| `swiss` | 瑞士网格风:强对比黑白、12 栏网格参考线、红色方点、悬浮反色 |
| `editorial` | 现代编辑排版风:衬线大标题、纸感底色、报刊式排版 |

三套主题在 `src/themes/<名字>/` 下各自独立(样式 + 字体 + 入口),**构建时只会打包被选中的那一套**,
互不混装;首页结构也按主题区分(`src/views/home/` 下的三个组件,由 `src/views/Home.tsx` 按 `theme` 调度)。
每个主题的 `index.ts` 是入口,经 vite 插件以虚拟模块 `virtual:site-theme` 注入到 `src/main.tsx`。

```
src/themes/pixel/       style.css(像素字体体积小,直接静态引入)
src/themes/swiss/       style.css + fonts.ts(中文大字重,异步加载不阻塞首屏)
src/themes/editorial/   style.css + fonts.ts(同上)
```

明暗模式三套主题都支持,右上角按钮在昼夜之间切换。想换主题时只改 `site.yml` 一行即可。

## 设计稿

`design-preview/` 里留有选型阶段的设计 Demo(四套风格 + 选型总览页),仅作参考,
不参与构建;不需要时可整目录删除。本地预览:`node design-preview/serve.mjs`

## 部署说明

- 仓库 **Settings → Pages → Source** 选择 **GitHub Actions** 后,每次 push 到 `main` 分支会自动构建并发布。
- 线上地址:`https://<用户名>.github.io/ViteBlog/`
- ⚠️ `vite.config.js` 里的 `base: '/ViteBlog/'` 必须与仓库名一致,如果仓库改名需同步修改。
