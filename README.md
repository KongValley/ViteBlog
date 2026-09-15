# ViteBlog

基于 **Vue 3 + Vite** 的个人博客,托管在 GitHub Pages 上,通过 GitHub Actions 自动构建部署。

## 本地开发

```bash
npm install     # 安装依赖
npm run dev     # 启动开发服务器
npm run build   # 类型检查(vue-tsc)+ 构建生产版本到 dist/
npm run preview # 本地预览构建产物
```

项目使用 **TypeScript**:所有数据层(`src/data/*.ts`)有完整类型定义,
构建前会先跑 `vue-tsc` 类型检查,CI 上有类型错误会直接部署失败。

## 如何写文章

在 `src/posts/` 下新建一个 `.md` 文件即可,文件名就是文章链接里的 slug(如 `my-first-post.md` → `/post/my-first-post`)。

```markdown
---
title: 文章标题
date: 2026-09-15        # YYYY-MM-DD,首页按它倒序排列
tags: Vue, 随笔          # 逗号分隔,可中文
excerpt: 一两句话摘要,显示在首页卡片上。
---

正文用 Markdown 编写,支持代码块、表格、引用等。
```

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

## 部署说明

- 仓库 **Settings → Pages → Source** 选择 **GitHub Actions** 后,每次 push 到 `main` 分支会自动构建并发布。
- 线上地址:`https://<用户名>.github.io/ViteBlog/`
- ⚠️ `vite.config.js` 里的 `base: '/ViteBlog/'` 必须与仓库名一致,如果仓库改名需同步修改。
