---
title: Node.js 进阶（四）：工程化工具链
date: 2026-09-18
tags:
  - Node.js
  - 工具链
categories:
  - Node.js
excerpt: pnpm、TypeScript、ESLint、Prettier、Vitest、调试与环境变量——Node 项目的现代工具链一套配齐。这是 Node.js 从入门到精通系列的第四篇。
---

框架之外,决定开发体验的是工具链。这一篇把 Node 项目工程化的每一环过一遍:包管理、类型、规范、测试、调试。Python 生态对应的做法在[下一篇](/post/python-backend-06-toolchain),两边几乎能一一对上。

## 包管理器:选 pnpm

npm 是默认自带,但 2026 年新建项目建议直接上 **pnpm**:安装速度快、磁盘省(所有项目共享一个全局仓库,用硬链接引用,`node_modules` 不再每项目克隆一份),而且**依赖结构严格**——你只能 import 自己声明过的包,堵住"幽灵依赖"(用了没写进 package.json 的传递依赖)这类隐形地雷。

```bash
npm install -g pnpm     # 或 Node 22/24 自带的 corepack enable pnpm

pnpm add fastify        # 对应 npm install
pnpm add -D vitest      # 开发依赖
pnpm remove fastify
```

monorepo(一个仓库管多个包)也水到渠成,`pnpm-workspace.yaml` 一行:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

## TypeScript:后端也该开

后端代码同样受益于类型——重构有底、IDE 补全准、接口契约显式。最小 `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "strict": true,
    "outDir": "dist"
  },
  "include": ["src"]
}
```

**怎么跑 TS**:开发期用 `tsx`,直接执行不折腾:

```bash
pnpm add -D tsx
pnpm tsx watch src/index.ts   # 类型无关的即时执行 + 热重启
```

新版 Node(22.18+/23.6+)其实能直接 `node src/index.ts` 跑 TS 了——内置"类型剥离",只删类型不检查,和 `tsx` 思路一致。**记住这条分工:`node`/`tsx` 负责运行,类型检查交给 `tsc --noEmit`**,CI 里必须有一道。

产出可部署的 JS 用打包器 `tsup`(底层 esbuild,一条命令出 CJS/ESM/d.ts):

```bash
pnpm add -D tsup
pnpm tsup src/index.ts --format esm --dts
```

## 代码质量:ESLint + Prettier + tsc

三者分工明确:**ESLint 管代码质量**(潜在 bug、坏味道)、**Prettier 管格式**(引号缩进换行)、**tsc 管类型**。ESLint 9 起默认扁平配置,`eslint.config.js`:

```js
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { ignores: ["dist/"] },
);
```

```bash
pnpm add -D eslint typescript-eslint prettier
pnpm eslint . --fix
pnpm prettier . --write
```

团队协作必备,配上编辑器保存即格式化,`git diff` 里再也不会出现"只是格式变了"的提交。

## 测试:Vitest

Vitest 与 Vite 同源,零配置支持 TS 和 ESM,watch 模式丝滑:

```js
// math.test.js
import { describe, it, expect } from "vitest";
import { add } from "./math.js";

describe("add", () => {
  it("1 + 1 = 2", () => {
    expect(add(1, 1)).toBe(2);
  });
});
```

```bash
pnpm vitest          # watch 模式,边写边跑
pnpm vitest run      # 单次执行,CI 用
```

Node 其实还内置了 `node:test` 运行器(轻量、零依赖),写脚本级的小测试够用;要 mock、快照、覆盖率,还是 Vitest 顺手。

## 环境变量与调试

**配置**从环境变量读,本地用 `.env` 文件承载——Node 20.6+ 原生支持,不用再装 dotenv:

```bash
node --env-file=.env dist/index.js
```

**调试**别再 `console.log` 大法:VSCode 里直接打断点跑 Node 程序即可(内置 js-debug);命令行则是 `node --inspect-brk dist/index.js`,打开 Chrome 的 `chrome://inspect` 就能用 DevTools 单步。`--watch` + 断点,日常够用。

## 把命令收进 scripts

工具链的最终形态是 `package.json` 里一组约定俗成的入口:

```json
"scripts": {
  "dev": "tsx watch src/index.ts",
  "build": "tsup src/index.ts --format esm --dts",
  "lint": "eslint . && prettier . --check",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "start": "node dist/index.js"
}
```

新人克隆仓库,`pnpm install && pnpm dev` 就能跑——这就是工程化的意义。

## 动手练习

1. 把[第三篇](/post/node-03-web-frameworks)的待办 API 迁到 TypeScript + pnpm 项目,配齐 scripts 六件套;
2. 给 API 写三组 Vitest 测试:正常创建、空标题 400、不存在的 id 404;
3. 故意写一个 `import` 未声明依赖的文件,体验 pnpm 的严格依赖报错,再用 ESLint 跑一遍看输出。
