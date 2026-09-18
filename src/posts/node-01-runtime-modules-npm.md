---
title: Node.js 入门（一）：运行时、模块系统与 npm
date: 2026-09-18
tags:
  - Node.js
  - 入门
  - npm
categories:
  - Node.js
excerpt: Node 到底是什么、模块系统怎么选、package.json 和 npm 的门道——搭好 Node 开发的地基。这是 Node.js 从入门到精通系列的第一篇。
---

你已经会用 JavaScript 写浏览器页面(参见 [JS 系列](/post/js-01-variables-types-control-flow)),现在让同一门语言跑在服务器上——这就是 Node.js。本系列五篇,从运行时原理一路讲到框架、工具链和生产部署,和 [Python 后端系列](/post/python-backend-01-http-wsgi-asgi)正好互相印证。

本文示例基于 Node 22 LTS 及以上版本。

## Node 到底是什么

Node 不是一门语言,而是 **JavaScript 的运行时**:把 Chrome 的 V8 引擎(负责执行 JS)和 libuv(负责事件循环与非阻塞 I/O)打包在一起,再配上 `fs`、`http`、`path` 这些内置模块。浏览器里的 JS 没有文件系统,Node 里全都有。

它最核心的卖点是**事件驱动、非阻塞 I/O**:发起一次磁盘读写或网络请求时不会干等,而是注册回调继续干别的,完成后事件循环通知你。单线程就能扛住大量并发连接——这正是 Web 服务最需要的形状,也解释了为什么 Node 几乎不用于 CPU 密集型计算。

## 安装与版本管理

官网下载 LTS 安装包能用,但正经开发建议用**版本管理器**,让不同项目用不同 Node 版本。推荐 `fnm`(快)或老牌的 `nvm`:

```bash
fnm install 22      # 安装 Node 22 LTS
fnm use 22
node -v             # v22.x.x
```

命令行直接敲 `node` 进入 REPL,可以当计算器用,也能随时试验 API;`Ctrl+D` 退出。

## 第一个脚本

```js
// hello.mjs
const who = process.argv[2] ?? "世界";
console.log(`你好, ${who}!`);
```

```bash
node hello.mjs 邻居      # 你好, 邻居!
node --watch hello.mjs   # 文件一改动自动重跑,开发期常开
```

`process.argv` 是命令行参数数组,前两项固定是 node 路径和脚本路径,业务参数从下标 2 开始。

## 模块系统:CommonJS 与 ESM

Node 历史上用 **CommonJS** 规范:`require()` 导入、`module.exports` 导出。如今的标准是 **ESM**(和浏览器一致的 `import`/`export`),新项目应当默认用 ESM——只要在 `package.json` 里写上 `"type": "module"`:

```json
{ "type": "module" }
```

```js
import { readFile } from "node:fs/promises";

const text = await readFile("notes.txt", "utf8");
console.log(text);
```

三个要点:内置模块加 `node:` 前缀(一眼区分内置与第三方,也防止恶意包抢注);ESM 顶层可以直接 `await`(顶层 await);老的 CommonJS 代码用 `.cjs` 后缀或没有 `type` 字段的包照常工作,`.mjs` 则强制 ESM。

## package.json 解剖

`npm init -y` 生成的这份 JSON 是整个项目的"户口本":

```json
{
  "name": "my-app",
  "type": "module",
  "scripts": {
    "dev": "node --watch app.js",
    "test": "vitest run"
  },
  "dependencies": {
    "express": "^5.1.0"
  },
  "devDependencies": {
    "vitest": "^3.2.0"
  }
}
```

- `scripts`:自定义命令,`npm run dev` 执行;**依赖包里的命令行工具在这里可以直接调用**(npm 会把 `node_modules/.bin` 加进 PATH),所以 `vitest run` 不用写完整路径;
- `dependencies`:运行时需要的包;`devDependencies`:只有开发/构建时需要(测试框架、打包器),装的时候用 `npm i -D`;
- 语义化版本:`^5.1.0` 允许升级到 `<6.0.0`(新功能不破坏),`~5.1.0` 只允许补丁版 `<5.2.0`。

## npm 四板斧

```bash
npm install            # 按 package.json + lock 装齐依赖
npm install express    # 装包并写入 dependencies
npm install -D vitest  # 装包并写入 devDependencies
npm ci                 # 严格按 package-lock.json 安装,CI 环境专用,更快
```

`package-lock.json` 锁定了每个依赖的**精确版本**,必须提交进 git——它能保证你和同事、和 CI 装出完全相同的依赖树。`npm ci` 就是无脑照着 lock 装,绝不顺手升级。

至于 `node_modules` 为什么是个黑洞:每个包还各自带着自己的依赖,层层展开。记住两条就够——**不提交进 git**(`.gitignore` 加一行),**环境可以随时重建**(`npm ci` 一步还原)。

## 动手练习

1. 用 fnm 装两个 Node 版本,在同一目录切换,`node -v` 确认生效;
2. 写一个 ESM 脚本,用 `readFile` 读自己的 `package.json` 并打印 `name` 字段(提示:`JSON.parse`);
3. `npm init` 一个项目,装上 express,故意删掉 `package-lock.json` 后分别跑 `npm install` 和 `npm ci`,观察报错差异。
