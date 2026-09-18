---
title: TypeScript 入门（一）：环境搭建与第一个 TS 程序
date: 2026-09-19 09:00:00
tags:
  - TypeScript
  - 入门
  - 环境搭建
categories:
  - TypeScript
excerpt: 为什么前端都在用 TypeScript?装好工具链,编译出第一个 TS 程序,理解"类型注解"到底在做什么。这是 TypeScript 从入门到精通系列的第一篇。
---

TypeScript(简称 TS)是 JavaScript 的超集:所有合法的 JS 都是合法的 TS,再往上叠加一套**类型系统**。代码最终会被编译成纯 JS,浏览器和 Node 该怎么跑还怎么跑。

本系列七篇,从环境搭建一路讲到泛型、高级类型和工程化配置。这篇先把工具链跑通。

## 为什么需要 TypeScript

先看一段纯 JS 代码,它在运行时才会暴露问题:

```js
function add(a, b) {
  return a + b
}

add(1, '2') // 结果是 '12',而不是 3
```

这类"拼写错误、传错类型、改了字段名忘记改引用"的问题,在大型项目里占了大头。TS 的解法是:在**编译期**就把类型对上,让错误尽早暴露:

```typescript
function add(a: number, b: number): number {
  return a + b
}

add(1, '2') // ❌ 编译报错:string 不能赋给 number 参数
```

编辑器(尤其 VS Code)还会借助类型信息给出智能提示、自动补全和重构支持,这是 TS 最大的日常收益。

## 准备环境

TS 编译依赖 Node.js,建议安装最新的 LTS 版本(写作时是 Node 22+),自带 npm。装好后验证:

```bash
node -v
npm -v
```

然后全局安装 TypeScript 编译器 `tsc`:

```bash
npm install -g typescript
tsc -v
```

> 全局安装方便在命令行里到处用;如果只想装在单个项目里,可以 `npm install -D typescript`,再用 `npx tsc` 调用。

## 第一个 TS 程序

新建目录并写一个 `hello.ts`:

```typescript
function greet(name: string): string {
  return `Hello, ${name}!`
}

const message: string = greet('TypeScript')
console.log(message)
```

其中 `name: string` 和 `: string` 就是**类型注解**——告诉编译器这个函数收什么、回什么。编译它:

```bash
tsc hello.ts
```

目录里会多出一个 `hello.js`,内容几乎一样,只是去掉了类型注解:

```js
function greet(name) {
  return `Hello, ${name}!`
}
const message = greet('TypeScript')
console.log(message)
```

再用 Node 跑一下:

```bash
node hello.js
# Hello, TypeScript!
```

## 认识 tsconfig.json

单个文件可以 `tsc 文件名` 直接编译,但真实项目需要一个 `tsconfig.json` 来统管全局。生成它:

```bash
tsc --init
```

得到的文件里都是带注释的配置项,先认识最关键的几个:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "esModuleInterop": true
  },
  "include": ["src"]
}
```

之后在项目里直接 `tsc` 就会按配置编译整个 `src/`。

> `strict: true` 是新项目的最佳实践,它一次性打开 `noImplicitAny`、`strictNullChecks` 等一系列检查。虽然一开始报错会变多,但换来的代码质量是值得的——这些细节会在本系列第七篇展开。

## 小结

- TS = JS + 类型系统,编译产物还是纯 JS
- 用 `tsc` 编译,用 `tsconfig.json` 管理项目级配置
- 类型注解让错误提前到编译期、让编辑器更聪明

下一篇我们正式进入类型世界:[基础类型与类型注解](/post/typescript-guide/ts-02-basic-types)。
