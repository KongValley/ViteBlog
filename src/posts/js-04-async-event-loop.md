---
title: JavaScript 进阶（四）：异步编程与事件循环
date: 2026-09-18 11:45:00
cover: /ViteBlog/images/covers/js-04-async-event-loop.jpg
tags:
  - JavaScript
  - 进阶
  - 异步
categories:
  - JavaScript
excerpt: setTimeout 和 Promise 谁先执行?事件循环给出了答案。这篇讲透回调、Promise、async/await 的演进,以及宏任务与微任务的执行顺序。
---

JS 是**单线程**语言:同一时刻只能干一件事。但网络请求、定时器、文件读取都是耗时的,如果同步等,页面就卡死了。异步就是解决之道 —— 而理解异步,绕不开**事件循环**。

## 事件循环:代码到底按什么顺序执行

JS 引擎有一条调用栈,外还有两个队列:**宏任务队列**(setTimeout、I/O)和**微任务队列**(Promise.then、queueMicrotask)。每轮循环:清空调用栈 → **清空全部微任务** → 取一个宏任务 → 再清微任务……

看一道经典题:

```js
console.log('1')

setTimeout(() => console.log('2'), 0)

Promise.resolve().then(() => console.log('3'))

console.log('4')

// 输出:1 4 3 2
// 同步代码(1、4)最先跑完
// 微任务(3)在同步之后、宏任务(2)之前
// 就算 setTimeout 写 0ms,也要排在微任务后面
```

## Promise:把回调嵌套变成链式调用

`Promise` 表示"一个未来才有结果的操作",有三种状态:`pending` → `fulfilled`(成功)或 `rejected`(失败),状态一经改变不可逆。

```js
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

wait(1000)
  .then(() => console.log('1 秒后'))
  .then(() => console.log('再等一秒'))
  .catch((err) => console.error('出错了', err))
  .finally(() => console.log('无论如何都执行'))
```

链式调用的价值:`then` 里返回的值会传给下一个 `then`,把层层嵌套的"回调地狱"拍平成一条线。

组合工具:

```js
Promise.all([api1, api2, api3]) // 全部成功才成功,一个失败即失败
Promise.allSettled([api1, api2]) // 等全部结束,无论成败
Promise.race([api1, timeout]) // 谁先完成用谁的(常做超时控制)
```

## async/await:用同步的写法写异步

`async` 函数返回 Promise,`await` 等待 Promise 结果 —— 代码形态和同步一样,可读性最好:

```js
async function loadUser() {
  try {
    const res = await fetch('https://api.example.com/user/1')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const user = await res.json()
    console.log(user)
  } catch (err) {
    console.error('加载失败:', err)
  } finally {
    console.log('加载结束')
  }
}
```

两个细节:

- `await` 后面的代码相当于放在 `.then` 里,同样是微任务
- 多个独立的请求**并行**发,别一个接一个 `await`(串行太慢),用 `Promise.all` 打包:

```js
// ❌ 串行:总耗时 = a + b
const a = await fetchA()
const b = await fetchB()

// ✅ 并行:总耗时 ≈ max(a, b)
const [a2, b2] = await Promise.all([fetchA(), fetchB()])
```

## 小结

- 事件循环:同步 → 微任务清空 → 一个宏任务 → 循环
- `Promise` 三态不可逆,`then` 链拍平回调地狱,`all` / `race` 组合控制
- `async/await` 是 Promise 的语法糖,`try/catch` 接住错误,并行用 `Promise.all`
- 永远给 Promise 配上错误处理,未捕获的 rejection 是线上事故的常客

最后一篇,把零散的知识点串成体系:**ES6+ 特性、模块与工程化**。
