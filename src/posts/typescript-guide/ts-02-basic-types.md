---
title: TypeScript 入门（二）：基础类型与类型注解
date: 2026-09-19 09:30:00
tags:
  - TypeScript
  - 入门
  - 基础类型
categories:
  - TypeScript
excerpt: string、number、boolean 之外还有元组、枚举,以及 any 与 unknown 的取舍——把 TypeScript 的基础类型一次讲清。这是 TS 系列的第二篇。
---

上一篇我们把工具链跑通了([环境搭建](/post/typescript-guide/ts-01-getting-started)),这篇开始认识 TS 的"砖块":基础类型。记住一个大原则——**能推断就不必手写**,编译器猜得出来时,注解是多余的。

## 类型推断

TS 会根据初始值自动推断变量类型,所以很多地方不用写注解:

```typescript
let name = 'TypeScript' // 推断为 string
// name = 123           // ❌ 报错

const count = 42        // 推断为字面量类型 42(const 不可变)
let count2 = 42         // 推断为 number
```

## 原始类型

JS 里的原始值在 TS 里都有对应类型:

```typescript
const str: string = 'hello'
const num: number = 42          // 也支持 0b/0o/0x 进制写法
const bool: boolean = true
const nul: null = null
const und: undefined = undefined
const sym: symbol = Symbol('id')
const big: bigint = 100n        // 目标版本需支持 bigint
```

其中 `null` 和 `undefined` 在严格模式下不能随便赋给别的类型:

```typescript
let s: string = 'hi'
// s = null   // ❌ strictNullChecks 下报错
```

## 数组与元组

数组有两种写法,`T[]` 更常用:

```typescript
const nums: number[] = [1, 2, 3]
const strs: Array<string> = ['a', 'b'] // 泛型写法,第五篇细讲
```

元组(tuple)是**定长、定序**的数组:

```typescript
const point: [number, number] = [10, 20]
// point = [10]        // ❌ 长度不对
// point = [10, 'x']   // ❌ 类型不对
```

## 枚举

枚举给一组有名字的常量一个友好别名:

```typescript
enum Direction {
  Up,
  Down,
  Left,
  Right,
}

console.log(Direction.Up)   // 0
console.log(Direction[0])   // 'Up'(数字枚举有反向映射)
```

数字枚举默认从 0 自增,也可以手动指定;字符串枚举可读性更好:

```typescript
enum Status {
  Pending = 'pending',
  Success = 'success',
  Failed = 'failed',
}
```

## any 与 unknown

`any` 是"逃生舱":关闭一切检查,失去类型保护,能用尽量少用。

```typescript
let value: any = 123
value = 'abc'
value.foo.bar() // 编译不报错,运行时才炸
```

`unknown` 是"安全的 any":同样能装任何值,但**用之前必须先收窄类型**。

```typescript
let value: unknown = 123

if (typeof value === 'number') {
  console.log(value.toFixed(2)) // ✅ 这里才被当成 number
}
// value.toFixed(2)             // ❌ unknown 上不能直接调用
```

> 一句话:拿不准类型时用 `unknown` 而不是 `any`,它强迫你在使用前把类型搞清楚。

## void 与 never

`void` 表示"没有返回值",常见于函数:

```typescript
function log(msg: string): void {
  console.log(msg)
}
```

`never` 表示"永远不可能有值":抛异常、死循环,或穷尽检查后剩下的空集。

```typescript
function fail(message: string): never {
  throw new Error(message)
}
```

## 字面量类型

把具体的值当成类型,天然适合做"白名单"约束:

```typescript
let direction: 'left' | 'right' = 'left'
// direction = 'up' // ❌ 不在联合类型里
```

## 小结

- 能推断就不注解,`const` 会推断成字面量类型
- 数组 `T[]`、元组定长定序、枚举给常量起名
- 优先 `unknown` 而非 `any`;`never` 用于"永不返回"

下一篇开始组织复杂结构:[接口与类型别名](/post/typescript-guide/ts-03-interface-type-alias)。
