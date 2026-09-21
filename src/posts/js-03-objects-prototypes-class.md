---
title: JavaScript 进阶（三）：对象、原型与 class
date: 2026-09-18 11:00:00
cover: /ViteBlog/images/covers/js-03-objects-prototypes-class.jpg
tags:
  - JavaScript
  - 进阶
  - 原型链
categories:
  - JavaScript
excerpt: 对象是 JS 里几乎一切事物的形态。这篇理清原型链的查找规则、this 的绑定,以及现代写法 class —— 看懂它,框架源码里的各种"魔法"就不再神秘。
---

上一篇讲了函数和闭包,这一篇聊 JS 里最容易被讲玄乎的部分:**对象与原型**。理解它之后,你会发现所谓"魔法"不过是几条朴素的查找规则。

## 对象:键值对的集合

```js
const user = {
  name: 'Kong',
  age: 18,
  'full-name': 'Kong Zhipeng', // 带特殊字符的键要加引号
  greet() {
    console.log(`我是 ${this.name}`) // 方法简写
  },
}

user.name // 点访问
user['full-name'] // 方括号访问(键是变量或含特殊字符时)
delete user.age // 删除属性
```

对象是**引用类型**:赋值传的是"地址",不是拷贝。

```js
const a = { x: 1 }
const b = a
b.x = 2
console.log(a.x) // 2 ← a、b 指向同一个对象
```

要独立副本用浅拷贝 `{ ...a }`,嵌套对象则需深拷贝(如 `structuredClone(a)`)。

## 原型链:属性的查找规则

每个对象都有一个隐藏的 `[[Prototype]]`(可用 `__proto__` 访问),指向另一个对象。读属性时如果自己没有,就顺着原型链一路向上找,直到 `null`:

```js
const arr = [1, 2, 3]
arr.map // arr 自己没有 map
// → 找 Array.prototype,有!
// → map 就定义在这里,所以所有数组都能用
```

`class` 出现之前,JS 用函数 + `prototype` 实现复用,这套写法在老代码和框架源码里仍然常见:

```js
function Animal(name) {
  this.name = name
}
Animal.prototype.speak = function () {
  console.log(`${this.name} 叫了一声`)
}

const dog = new Animal('狗')
dog.speak() // 狗 叫了一声(方法来自原型,所有实例共享)
```

## class:原型的语法糖

ES6 的 `class` 本质上就是上面那套原型的语法糖,但写法清晰得多:

```js
class Animal {
  constructor(name) {
    this.name = name
  }
  speak() {
    console.log(`${this.name} 叫了一声`)
  }
  static category() {
    return '生物' // 静态方法,挂在类上而不是实例上
  }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name) // 必须先调用父类构造器
    this.breed = breed
  }
  speak() {
    super.speak()
    console.log(`${this.name}(${this.breed})汪汪叫`)
  }
}

const dog = new Dog('旺财', '柴犬')
dog.speak()
```

## this:谁调用,指向谁

`this` 的值由**调用方式**决定,四条规则按优先级排列:

```js
const obj = {
  name: 'obj',
  normal() {
    console.log(this.name) // this = obj(对象方法调用)
  },
  arrow: () => {
    // this = 定义处的外层 this(箭头函数没有自己的 this)
  },
}

const fn = obj.normal
fn() // this = undefined/全局(独立调用)

new Animal('x') // this = 新创建的实例(new 绑定)
obj.normal.call({ name: '手动' }) // this = 传入的对象(call/apply/bind)
```

一句话:**箭头函数适合当回调(继承外层 this),对象方法用普通函数**。

## 小结

- 对象是引用类型,赋值传地址;浅拷贝用展开运算符
- 属性查找沿原型链向上,直到 `null`;方法挂在原型上被所有实例共享
- `class` 是原型的语法糖,`extends` / `super` 处理继承
- `this` 看调用方式:对象方法、独立调用、new、call/bind,箭头函数没有自己的 this

下一篇是 JS 的重点兼难点:**异步编程与事件循环**。
