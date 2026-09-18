---
title: TypeScript 进阶（五）：泛型
date: 2026-09-19 11:00:00
tags:
  - TypeScript
  - 进阶
  - 泛型
categories:
  - TypeScript
excerpt: 让函数、接口、类"记住"传进来的类型——泛型是 TypeScript 从"会写类型"到"会设计类型"的分水岭。TS 系列第五篇。
---

写一个"返回什么类型就收什么类型"的函数,不用泛型只能靠 `any` 糊弄。泛型(Generic)让类型本身也变成"参数",是 TS 最强大也最核心的能力。

## 为什么要泛型

```typescript
function identity(value: any): any {
  return value
}

const s = identity('hello') // s 是 any,丢了类型信息
```

换成泛型:

```typescript
function identity<T>(value: T): T {
  return value
}

const s = identity('hello') // s 推断为 string
const n = identity(42)      // n 推断为 number
```

`<T>` 声明了一个"类型参数",调用时 TS 会拿实参类型代入 `T`,于是返回类型也精确了。

## 泛型函数

也可以显式指定类型参数:

```typescript
function first<T>(arr: T[]): T | undefined {
  return arr[0]
}

first<number>([1, 2, 3])   // 显式指定
first(['a', 'b', 'c'])     // 自动推断
```

## 泛型接口与泛型类

```typescript
interface Result<T> {
  data: T
  success: boolean
}

const ok: Result<string> = { data: 'done', success: true }

class Queue<T> {
  private items: T[] = []
  push(item: T): void {
    this.items.push(item)
  }
  pop(): T | undefined {
    return this.items.shift()
  }
}

const q = new Queue<number>()
q.push(1)
```

## 泛型约束 extends

泛型不能"裸奔"——`T` 上没有已知属性。用 `extends` 约束它的形状:

```typescript
interface HasLength {
  length: number
}

function logLength<T extends HasLength>(value: T): number {
  return value.length // ✅ T 一定有 length
}

logLength('abc')
logLength([1, 2, 3])
// logLength(42) // ❌ number 没有 length
```

## 默认类型参数

泛型也能给默认值,调用时可以不传:

```typescript
interface ApiResponse<T = unknown> {
  data: T
  code: number
}

const resp: ApiResponse = { data: 123, code: 0 } // T 默认 unknown
```

## 多个类型参数

```typescript
function pair<K, V>(key: K, value: V): [K, V] {
  return [key, value]
}

const p = pair('name', 'Kong') // [string, string]
```

## keyof 初探

`keyof T` 取出对象类型所有键的联合,常和泛型配合做"属性名约束":

```typescript
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}

const user = { name: 'Kong', age: 18 }
getProperty(user, 'name') // ✅
// getProperty(user, 'email') // ❌ 'email' 不是 user 的键
```

这里 `T[K]` 是**索引访问类型**——取 `T` 里 `K` 对应属性的类型,第六篇会展开。

## 小结

- 泛型让类型变成参数,复用逻辑时保留精确类型
- `extends` 约束类型参数,`keyof` 取键的联合
- 泛型接口/类是写工具库的基础

下一篇挑战更硬的:[高级类型与类型收窄](/post/typescript-guide/ts-06-advanced-types)。
