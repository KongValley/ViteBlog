---
title: 😗Symbol in TypeScript
date: 2020-02-02 18:06:13
cover: /ViteBlog/images/covers/typescript__typescript-symbol.jpg
tags:
  - TypeScript Basic
categories:
  - TypeScript
---

## Web Bookmark
- [MDN上的Symbol介绍](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Symbol)

## 基础特性

1.唯一性

```typescript
const s1 = Symbol('Sym')
const s2 = Symbol('Sym')
console.log(s1 === s2); // 永远返回 false
```

2.不支持 new

```typescript
new Symbol() // TypeError: Symbol is not a constructor
```

3.不会隐式转换

```typescript
const sym = Symbol('Sym')
alert(sym)  // TypeError: Cannot convert a Symbol value to a string
```

4.参数只用来作为描述

```typescript
const sym = Symbol('Sym')
console.log(sym.description) // Sym
```

5.目的：用来作为属性名

```typescript
let prop = 'name';

const info = {
  [prop]: 'symbol test'
};

console.log(info);
```