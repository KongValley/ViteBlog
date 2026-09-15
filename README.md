# ViteBlog

基于 **Vue 3 + Vite** 的个人博客,托管在 GitHub Pages 上,通过 GitHub Actions 自动构建部署。

## 本地开发

```bash
npm install     # 安装依赖
npm run dev     # 启动开发服务器
npm run build   # 构建生产版本到 dist/
npm run preview # 本地预览构建产物
```

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

## 站点信息

博客名称、作者、GitHub 链接等在 `src/data/site.js` 里统一修改。

## 部署说明

- 仓库 **Settings → Pages → Source** 选择 **GitHub Actions** 后,每次 push 到 `main` 分支会自动构建并发布。
- 线上地址:`https://<用户名>.github.io/ViteBlog/`
- ⚠️ `vite.config.js` 里的 `base: '/ViteBlog/'` 必须与仓库名一致,如果仓库改名需同步修改。
