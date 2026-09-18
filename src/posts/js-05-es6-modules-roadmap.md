---
title: JavaScript 精通（五）：ES6+ 特性、模块与工程化
date: 2026-09-18 12:30:00
tags:
  - JavaScript
  - 工具链
categories:
  - JavaScript
excerpt: 系列收官:解构、可选链等高频语法糖,Map/Set 数据结构,模块化,内存管理与 GC,以及从"会写 JS"到"精通 JS"的完整路线图。
---

系列最后一篇。前面四篇把语言核心讲完了,这篇把日常开发的高频语法糖、模块化、内存管理串起来,最后给一张从"会写"到"精通"的路线图。

## 高频语法糖:让代码又短又清楚

```js
// 解构赋值:从对象/数组里直接取值
const { name, age = 18 } = user
const [first, ...rest] = [1, 2, 3, 4]

// 展开运算符:合并对象/数组(浅拷贝)
const merged = { ...defaults, ...options }
const newArr = [...arr1, ...arr2]

// 模板字符串:变量嵌入 + 多行
const msg = `你好 ${name},今年 ${age} 岁`

// 可选链 ?. 和空值合并 ??:处理不确定的数据结构
const city = user.address?.city // address 不存在也不报错,得到 undefined
const count = input ?? 0 // 只有 null/undefined 才用默认值(0 和 '' 会保留)
```

`?.` 和 `??` 是处理接口返回数据的神器,能省掉大片 `if (obj && obj.a && obj.a.b)`。

## 数组三件套:map、filter、reduce

函数式风格的日常主力,优先于手写 for 循环:

```js
const nums = [1, 2, 3, 4, 5]

const evens = nums.filter((n) => n % 2 === 0) // [2, 4]   过滤
const doubled = evens.map((n) => n * 2) // [4, 8]      一对一变换
const total = doubled.reduce((sum, n) => sum + n, 0) // 12 归并成一个值

// 一行流:求偶数的平方和
const sum = nums.filter((n) => n % 2 === 0).map((n) => n ** 2).reduce((s, n) => s + n, 0)
```

## Map / Set / Symbol

```js
const map = new Map() // 任意类型的键(对象也能当键),记插入顺序
map.set('a', 1).set(42, 'answer')

const set = new Set([1, 2, 2, 3]) // 自动去重:[1, 2, 3]
const unique = [...new Set(duplicateArray)]

const id = Symbol('id') // 全局唯一,常用作"不会撞名的属性键"
```

## 模块化:import / export

现代 JS 用 ES Module 组织代码,一个文件就是一个模块:

```js
// utils.js
export function formatDate(d) {
  return d.toISOString().slice(0, 10)
}
export default class Store {} // 每个文件只能有一个默认导出

// main.js
import Store, { formatDate } from './utils.js'
```

本博客就是典型工程:`src/data/` 是模块,`src/posts/*.md` 由构建时扫描注入,`main.tsx` 作为入口把一切组装起来。

## 内存与垃圾回收

JS 引擎自动 GC,但**引用不消失,内存就不会回收**。最常见的泄漏:

- 忘记 `clearInterval` / `clearTimeout` 的定时器
- 被 `addEventListener` 挂上却从不 `removeEventListener` 的监听器
- 存进全局数组却再也不用的数据

写 SPA(比如这个 React 博客)时,组件卸载时清理副作用是基本素养。

## 从会写到精通:一张路线图

1. **基础夯实**:系列前四篇的内容,能脱手写出防抖节流、Promise 封装
2. **DOM 与浏览器**:事件机制、渲染原理、存储(cookie/localStorage/IndexedDB)
3. **TypeScript**:给 JS 加上类型系统(本博客已经全量 TS 7)
4. **框架**:React / Vue 任选其一深入,理解响应式与虚拟 DOM 的思想
5. **工程化**:Vite/Webpack、ESLint、测试(Vitest)、CI/CD(参考本站的 GitHub Actions)
6. **读源码与手写**:手写 call/apply/bind、Promise、事件总线;读一个主流库的源码
7. **性能与底层**:事件循环进阶、内存分析、网络与缓存

"精通"不是一个终点,而是**遇到问题能拆解到底层原理**的状态。本站后续会继续更新这条路上的实战笔记,欢迎常来。
