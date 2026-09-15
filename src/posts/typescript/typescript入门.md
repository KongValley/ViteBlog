---
title: 🦄TypeScript入门
date: 2020-01-09 0:30:20
tags:
  - TypeScript Basic
categories:
  - TypeScript
---
## 简介
![](https://blog-chara-img.oss-cn-shanghai.aliyuncs.com/blog-img/TypeScript%E5%85%A5%E9%97%A8/Snipaste_2020-04-19_20-31-20.png)
从 npm 包的下载量就可以看出 TypeScript 已经逐渐成为前端必不可少的工具了，都2020年了，再不学，就只能2021年学了🤣
## Quick Start
- [🦄TypeScript 入门](/typescript/typescript入门)

## Base
- [🌈TypeScript + Webpack](/typescript/typescript-webpack)
- [🌈TypeScript 基础类型](/typescript/typescript基础类型)

## Web Bookmark

[GitHub仓库：基础类型](https://github.com/KongValley/ToLearnTypeScript/tree/master/types)

## Your Environment

**💡你需要做的准备：**
- Node.js > 8.0，最好是最新的稳定版
- 一个包管理工具 npm 或者 yarn
- 一个文本编辑器或者 IDE

## Install TypeScript

```bash
npm install TypeScript -g
```

## Init Project

先创建下目录

```bash
mkdir ts-study && cd ts-study
```

再创建 src 目录（一般用来存放项目代码）

```bash
mkdir src && touch src/index.ts
```

**注意：** 如果你的系统是Windows的话，`touch`并不会生效，你可以用`New-Item`来代替`touch`，[查看相关issue](https://github.com/PowerShell/PowerShell/issues/8621)

```bash
New-Alias touch New-Item
```

初始化项目 package.json

```bash
npm init
```

初始化 ts 配置文件

```bash
tsc --init
```


## VSCode Auto Compile

在终端下拉菜单中选择运行任务

![](https://blog-chara-img.oss-cn-shanghai.aliyuncs.com/blog-img/TypeScript%E5%85%A5%E9%97%A8/ts-1.png)

选择`tsc:监视`（当你的文件发生改动时会自动编译）

![](https://blog-chara-img.oss-cn-shanghai.aliyuncs.com/blog-img/TypeScript%E5%85%A5%E9%97%A8/ts-2.png)