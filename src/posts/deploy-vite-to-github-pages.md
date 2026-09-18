---
title: 手把手把 Vite 博客部署到 GitHub Pages
date: 2026-09-15
tags:
  - Vite
  - GitHub Pages
  - 部署
categories:
  - Build Blog
excerpt: 从创建仓库到自动部署,完整记录 Vite 项目上 GitHub Pages 的关键步骤:base 路径、Actions 工作流、SPA 404 兜底。
---

这篇笔记记录把 Vite 项目部署到 GitHub Pages 的完整流程。整个过程只需要三步:配置 base 路径、写一个 Actions 工作流、开启 Pages。

## 第一步:设置 base 路径

GitHub Pages 的个人/项目站点不是部署在域名根路径,而是在 `https://用户名.github.io/仓库名/` 这样的**子路径**下。所以必须告诉 Vite 这个前缀,否则构建出来的 js/css 引用会 404:

```js
// vite.config.js
export default defineConfig({
  base: '/ViteBlog/', // 与仓库名保持一致
})
```

## 第二步:编写 GitHub Actions 工作流

在 `.github/workflows/deploy.yml` 里使用官方的 Pages Action:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

## 第三步:开启 Pages

仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。之后每次 push 到 `main` 分支就会自动构建并发布,一两分钟内生效。

## 两个容易踩的坑

1. **SPA 路由 404**:用了 `createWebHistory` 的单页应用,直接刷新或访问深层链接会 404,因为 GitHub Pages 找不到对应文件。解决办法是构建后把 `index.html` 复制一份作为 `404.html`,Pages 找不到路径时就会用它兜底,让前端路由接管。
2. **base 忘记配置**:本地 `npm run dev` 一切正常,部署后页面白屏、控制台一堆资源 404 —— 八成是 `base` 没设或和仓库名对不上。

搞定之后,你就拥有了一个完全免费、自动部署的个人博客。
