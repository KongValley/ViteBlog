---
title: TypeScript 进阶（三）：接口与类型别名
date: 2026-09-19 10:00:00
cover: /ViteBlog/images/covers/typescript-guide__ts-03-interface-type-alias.jpg
tags:
  - TypeScript
  - 进阶
  - interface
  - type
categories:
  - TypeScript
excerpt: interface 与 type 怎么定义对象形状、怎么互相扩展,以及两者到底该选谁。这是 TypeScript 从入门到精通系列的第三篇。
---

基础类型只能描述单个值,真实业务里我们面对的是**对象**。TS 用 `interface` 和 `type` 两种方式给对象"画像",这篇把它们讲透。

## 用 interface 定义形状

```typescript
interface User {
  name: string
  age: number
}

const user: User = {
  name: 'Kong',
  age: 18,
}
```

属性一旦声明就必须提供,想省掉就用可选属性 `?`:

```typescript
interface User {
  name: string
  age: number
  bio?: string // 可选
}
```

用 `readonly` 标记只读属性,赋值后不能再改:

```typescript
interface User {
  readonly id: number
  name: string
}

const user: User = { id: 1, name: 'Kong' }
// user.id = 2 // ❌ 只读
```

## 索引签名

需要"任意 key"的对象(比如字典)时用索引签名:

```typescript
interface Dict {
  [key: string]: string
}

const colors: Dict = {
  red: '#ff0000',
  green: '#00ff00',
}
```

## 函数与接口

接口除了描述对象,还能描述函数签名:

```typescript
interface Add {
  (a: number, b: number): number
}

const add: Add = (a, b) => a + b
```

## 接口继承

用 `extends` 复用并扩展已有接口,还支持多继承:

```typescript
interface Animal {
  name: string
}

interface Dog extends Animal {
  bark(): void
}

interface Robot {
  power: number
}

// 多继承
interface RobotDog extends Dog, Robot {}
```

## type 类型别名

`type` 能给任意类型起名字,不只是对象:

```typescript
type ID = string | number

type Point = {
  x: number
  y: number
}
```

它还能表达接口表达不了的**联合类型**和**交叉类型**:

```typescript
type Status = 'pending' | 'success' | 'failed' // 联合

type Named = { name: string }
type Aged = { age: number }
type Person = Named & Aged // 交叉:两者都要
```

## interface vs type,怎么选

两者能力高度重叠,官方建议:能用 `interface` 就用 `interface`,需要联合、元组、映射等"类型运算"时用 `type`。几个差异点:

- `interface` 同名声明会自动合并(声明合并),`type` 不行
- `interface` 只能描述对象形状,`type` 能描述任何类型
- `interface` 扩展是"继承"语义,`type` 交叉是"拼接"语义

```typescript
// 声明合并
interface Window {
  title: string
}
interface Window {
  count: number
}
// 最终 Window 同时拥有 title 和 count
```

## 小结

- `interface` 描述对象/函数形状,支持继承与声明合并
- `type` 是通用别名,能表达联合、交叉、元组等
- 对象优先 `interface`,复杂类型运算用 `type`

下一篇把"类"补上:[类与面向对象](/post/typescript-guide/ts-04-classes-oop)。
