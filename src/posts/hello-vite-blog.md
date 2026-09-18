---
title: 博客开张:为什么我选择 React + Vite 搭博客
date: 2026-09-15
tags:
  - 随笔
  - React
  - Vite
categories:
  - Build Blog
excerpt: 博客正式开张!聊聊为什么在众多方案里选了 React + Vite 这条路线,以及这个博客是怎么组织代码的。
---

这是本博客的第一篇文章,就聊聊这个博客本身是怎么来的吧。

## 为什么不用现成的博客系统?

静态博客的方案其实很多:Hexo、Hugo、Jekyll、Astro、VitePress……都是不错的选择。但作为一个想深入理解前端工程化的人,我更想自己动手写一遍 —— 从路由、文章数据组织,到深色模式、部署流水线,每一块都亲手实现,收获远比"装个主题"多。

而且 React + Vite 的组合足够轻快:

- **Vite** 的开发服务器秒级启动,热更新几乎无感
- **React** 的组件化 + Hooks 写起来很舒服,状态和逻辑复用清晰
- 构建产物是纯静态文件,扔到 GitHub Pages 上就完事,零运维成本

## 这个博客的代码结构

```
src/
├── posts/          # 文章目录,一个 .md 文件 = 一篇文章
├── data/           # posts.ts / markdown.ts / site.ts:数据与渲染层
├── views/          # 页面:首页 / 文章详情 / 标签 / 关于
├── components/     # 像素图标、名片卡等组件
└── App.tsx         # 路由与整体布局
```

写新文章的时候,只需要在 `src/posts/` 下新建一个 Markdown 文件:

```markdown
---
title: 文章标题
date: 2026-09-15
tags: React, 随笔
excerpt: 一两句话的摘要,显示在首页卡片上。
---

正文用 Markdown 随便写……
```

保存后首页就会自动出现这张卡片,不用改任何代码。

## 接下来

接下来会陆续写一些 React、Vite 相关的学习笔记,也会记录部署过程中踩的坑。如果你也想搭一个这样的博客,欢迎参考下一篇文章。
