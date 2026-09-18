---
title: TypeScript 精通（七）：工具类型与工程化配置
date: 2026-09-19 12:00:00
tags:
  - TypeScript
  - 精通
  - 工具类型
  - tsconfig
categories:
  - TypeScript
excerpt: Partial、Pick、ReturnType……这些内置工具类型你其实天天用;再把 tsconfig 的 strict、模块解析、声明文件讲透,收尾整个系列。
---

前六篇完成了"会用类型",这篇补齐"会用工具"。TS 内置了一批**工具类型(Utility Types)**,它们就是用第六篇的映射类型、条件类型拼出来的;再配合一份靠谱的 `tsconfig.json` 和声明文件,才算完整的工程化能力。

## 内置工具类型

假设有个用户模型:

```typescript
interface User {
  id: number
  name: string
  age: number
  email?: string
}
```

**对象改造类:**

```typescript
type PartialUser = Partial<User>      // 所有属性可选
type RequiredUser = Required<User>    // 所有属性必填
type ReadonlyUser = Readonly<User>    // 所有属性只读
type UserPreview = Pick<User, 'name' | 'age'>   // 只挑几个
type UserLite = Omit<User, 'id'>      // 去掉几个
```

**记录与函数类:**

```typescript
type StringMap = Record<string, string> // { [k: string]: string }

type Fn = (a: number, b: string) => boolean
type Params = Parameters<Fn>   // [a: number, b: string]
type Ret = ReturnType<Fn>      // boolean
```

**集合运算类:**

```typescript
type Status = 'pending' | 'success' | 'failed'
type NoFailed = Exclude<Status, 'failed'>       // 'pending' | 'success'
type KeepFailed = Extract<Status, 'failed'>     // 'failed'
type SafeName = NonNullable<string | null>      // string
```

**异步类:**

```typescript
type Resolved = Awaited<Promise<Promise<string>>> // string
```

> 这些都能用第六篇的知识手写出来,建议照着类型定义源码看一遍,理解会更深。

## typeof 与 keyof

`typeof` 从**值**反推出类型,`keyof` 取键的联合,二者常配合:

```typescript
const config = {
  host: 'localhost',
  port: 8080,
}

type Config = typeof config          // { host: string; port: number }
type ConfigKey = keyof Config        // 'host' | 'port'

function get<K extends ConfigKey>(key: K): Config[K] {
  return config[key]
}
```

## 声明文件 .d.ts

`.d.ts` 只描述类型、不产生运行时代码,用来给没有类型的 JS 库"补类型":

```typescript
// math-lib.d.ts
declare module 'math-lib' {
  export function add(a: number, b: number): number
}
```

主流库大多自带类型或发布到 DefinitelyTyped,装 `@types/xxx` 即可:

```bash
npm install -D @types/node
```

## tsconfig 常用配置

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

几个关键项说明:

- `strict`:总开关,建议永远为 `true`
- `noUncheckedIndexedAccess`:访问索引时带上 `undefined`,防"越界"漏判
- `moduleResolution: bundler`:配合 Vite/Webpack 等打包器使用
- `paths`:路径别名,`@/` 映射到 `src/`,配合 Vite 的 alias 一起用

## 与 React/Vite 集成

用 Vite 起 React + TS 项目(本博客就是这套栈):

```bash
npm create vite@latest my-app -- --template react-ts
```

模板自带 `tsconfig.json`、`tsconfig.app.json` 与 `vite.config.ts`,开箱即用。日常开发记住一点:让类型跟着数据流走——接口定义数据、泛型约束函数、工具类型组合派生类型。

## 系列回顾

- 一:环境搭建 → 二:基础类型 → 三:接口与类型别名
- 四:类与面向对象 → 五:泛型 → 六:高级类型与收窄 → 七:工具类型与工程化

到这里,从环境到类型编程的整条链路就打通了。接下来建议去读官方 Handbook 和 [TypeScript 入门](/post/typescript/typescript入门)这篇,再拿真实项目练手——类型系统的功力,最终是在大型代码库里练出来的。
