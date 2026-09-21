---
title: JavaScript 入门（一）：变量、类型与控制流
date: 2026-09-18 09:30:00
cover: /ViteBlog/images/covers/js-01-variables-types-control-flow.jpg
tags:
  - JavaScript
  - 入门
  - 基础语法
categories:
  - JavaScript
excerpt: 从 let/const 到数据类型与流程控制,搭好 JavaScript 的地基。这是 JS 从入门到精通系列的第一篇。
---

这是 JavaScript 系列的第一篇,从零开始搭地基:变量怎么声明、有哪些数据类型、程序怎么走分支和循环。学完这篇,你就能写出有基本逻辑的小程序了。

## 第一个程序

浏览器按 F12 打开控制台(Console),输入这行代码,你就已经入门了一半:

```js
console.log('Hello, JavaScript!')
```

正式项目里,JS 代码写在 `.js` 文件里,由 HTML 通过 `<script src="./index.js"></script>` 引入,或者像本博客一样,由 Vite 这类工具打包后加载。

## 变量声明:let、const 和已成历史的 var

现代 JS 只用 `let` 和 `const`:

```js
let score = 90 // 会重新赋值的变量用 let
score = 95

const name = 'Kong' // 不会再重新赋值的用 const(推荐默认)
// name = 'Li' // ❌ TypeError: Assignment to constant variable
```

`const` 锁的是"重新赋值",不是"不可变" —— 对象的内容仍然可以改:

```js
const user = { name: 'Kong' }
user.name = 'Li' // ✅ 可以,改的是属性
// user = {}     // ❌ 不行,这是重新赋值
```

`var` 是历史产物:它没有块级作用域、允许重复声明、会发生"变量提升",坑很多。看到老代码里的 `var`,理解即可,新代码一律 `let` / `const`。

## 数据类型:七种原始类型 + 对象

JS 的类型分两大类。**原始类型**(值本身):`string`、`number`、`boolean`、`undefined`、`null`、`symbol`、`bigint`;**引用类型**:`object`(数组、函数、日期等都算)。

```js
typeof 'hello'      // 'string'
typeof 42           // 'number'  (整数和小数是同一个类型)
typeof true         // 'boolean'
typeof undefined    // 'undefined'
typeof null         // 'object'  ← 历史 bug,判断 null 要用 === null
typeof {}           // 'object'
typeof []           // 'object'  ← 数组也是对象,判断数组用 Array.isArray([])
typeof function () {} // 'function'
```

两个新手必踩的坑:

1. **小数计算不精确**:`0.1 + 0.2 === 0.3` 是 `false`(二进制浮点数的锅),金额计算要用整数分或专门的库
2. **`==` 会偷偷转型**:`'1' == 1` 是 `true`。永远用 `===` 和 `!==`

## 类型转换:显式做,别隐式来

```js
Number('42')      // 42
String(42)        // '42'
Boolean('')       // false
Boolean(0)        // false
Boolean('0')      // true  ← 非空字符串都是 true,包括 '0'
```

记住六个"假值"就够了:`false`、`0`、`''`、`null`、`undefined`、`NaN`,其余全是真值。

## 控制流

```js
const hour = 21

if (hour < 6) {
  console.log('凌晨好')
} else if (hour < 12) {
  console.log('上午好')
} else {
  console.log('下午/晚上好')
}

// switch 适合对同一个值做多路判断(记得写 break)
switch (hour) {
  case 12:
    console.log('午饭时间')
    break
  default:
    console.log('继续写代码')
}

// 循环:遍历数组用 for...of,遍历对象用 for...in
const skills = ['HTML', 'CSS', 'JS']
for (const skill of skills) {
  console.log(skill)
}

const user2 = { name: 'Kong', age: 18 }
for (const key in user2) {
  console.log(key, user2[key])
}
```

另外两个控制流利器:三元表达式 `条件 ? a : b` 适合二选一赋值;`短路求值`(`&&` / `||` / `??`)适合写默认值,后面的文章会展开讲。

## 小结

- 变量用 `let` / `const`,默认 `const`
- 七种原始类型 + 对象;`typeof null` 是历史 bug;数组用 `Array.isArray` 判断
- 永远用 `===`;记住六个假值
- 遍历数组 `for...of`,遍历对象 `for...in`

下一篇讲 JS 的灵魂:**函数、作用域与闭包**。
