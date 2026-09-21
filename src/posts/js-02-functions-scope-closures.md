---
title: JavaScript 入门（二）：函数、作用域与闭包
date: 2026-09-18 10:15:00
cover: /ViteBlog/images/covers/js-02-functions-scope-closures.jpg
tags:
  - JavaScript
  - 入门
  - 闭包
categories:
  - JavaScript
excerpt: 函数是 JS 的一等公民。这篇讲清函数的三种写法、词法作用域,以及面试高频的闭包 —— 它不是玄学,是作用域的自然结果。
---

如果说数据类型是 JS 的砖块,函数就是钢筋 —— JS 里函数是"一等公民",可以像值一样被赋值、传递、返回。这篇讲函数、作用域,以及由它们自然引出的 **闭包**。

## 函数的三种写法

```js
// 1. 函数声明(有提升,可以先调用后定义)
function add(a, b) {
  return a + b
}

// 2. 函数表达式(把函数当值赋给变量)
const subtract = function (a, b) {
  return a - b
}

// 3. 箭头函数(更简洁,没有自己的 this —— 后面细说)
const multiply = (a, b) => a * b
const double = (n) => n * 2 // 只有一个参数可以省括号
const sayHi = () => console.log('hi') // 没有参数必须写括号
```

参数支持默认值和剩余参数:

```js
function greet(name = '访客', ...others) {
  console.log(`你好,${name}`, others)
}
greet() // 你好,访客 []
```

## 作用域:变量能被谁看见

JS 是**词法作用域**(也叫静态作用域):函数能访问哪些变量,由它**写在哪里**决定,而不是由它在哪里被调用。

```js
const global = '全局'

function outer() {
  const outerVar = '外层'
  function inner() {
    const innerVar = '内层'
    console.log(global, outerVar, innerVar) // 由内向外一层层找
  }
  inner()
}
```

变量查找像洋葱:从当前作用域向外层一层剥,找不到就报 `ReferenceError`。**块级作用域**:`let` / `const` 只在 `{}` 内有效,出了花括号就访问不到。

## 闭包:函数记住了它出生的地方

**函数和它词法作用域的组合,就是闭包**。典型形态:内层函数被返回到外面,但它依然能访问外层函数的变量。

```js
function createCounter() {
  let count = 0 // 这个变量只属于这个计数器
  return function () {
    count += 1
    return count
  }
}

const counterA = createCounter()
const counterB = createCounter()
counterA() // 1
counterA() // 2
counterB() // 1 ← 各数各的,count 被闭包"锁"住了
```

`count` 在 `createCounter` 执行完本该被回收,但因为返回的函数还引用着它,它就活了下来。闭包的常见用途:

- **私有变量**:上面的 `count` 外部无法直接修改,只能通过返回的函数操作
- **函数工厂**:带配置地生成函数(如不同精度的格式化函数)
- **防抖、节流**:定时器 id 就存在闭包里(面试常考,之后实战篇会手写)

## 面试经典:setTimeout 里取循环变量

```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0)
}
// 输出 3 3 3 —— var 没有块级作用域,三次回调共享同一个 i
```

把 `var` 换成 `let`,每轮循环都会创建一个**新的** `i`:

```js
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0)
}
// 输出 0 1 2 —— 每次迭代的 i 被各自的闭包记住
```

这道题同时考了闭包、作用域和异步执行顺序,值得动手敲一遍。

## 小结

- 箭头函数适合当回调;需要自己的 `this` 时用普通函数
- 作用域由书写位置决定,由内向外查找
- 闭包 = 函数 + 它记住的词法环境,核心用途是私有状态
- `var` + 循环 + 异步回调是经典坑,用 `let` 即可避免

下一篇进入对象的世界:**原型与 class**。
