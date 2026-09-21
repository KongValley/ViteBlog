---
title: TypeScript 精通（六）：高级类型与类型收窄
date: 2026-09-19 11:30:00
cover: /ViteBlog/images/covers/typescript-guide__ts-06-advanced-types.jpg
tags:
  - TypeScript
  - 精通
  - 高级类型
categories:
  - TypeScript
excerpt: 联合与交叉、类型守卫、可辨识联合、条件类型、映射类型——掌握这些,才算真正进入 TypeScript 的"精通"区间。TS 系列第六篇。
---

前面五篇打好了地基,这篇进入 TS 的"类型编程"层:让类型根据输入**计算**出新的类型,让编译器在分支里**收窄**出更精确的类型。

## 联合与交叉

```typescript
type ID = string | number      // 联合:满足其一
type A = { a: string }
type B = { b: number }
type AB = A & B                // 交叉:同时满足

const ab: AB = { a: 'x', b: 1 }
```

## 类型守卫与收窄

拿到联合类型后,TS 会"流式分析":一旦用 `typeof` / `instanceof` 判断过,分支里类型就被收窄了。

```typescript
function format(value: string | number): string {
  if (typeof value === 'string') {
    return value.toUpperCase() // 这里 value 是 string
  }
  return value.toFixed(2)      // 这里 value 是 number
}
```

`instanceof` 收窄类实例:

```typescript
class Dog { bark() {} }
class Cat { meow() {} }

function speak(animal: Dog | Cat) {
  if (animal instanceof Dog) {
    animal.bark()
  } else {
    animal.meow()
  }
}
```

## 自定义类型谓词

复杂判断可以封装成"类型谓词"函数,签名用 `x is T`:

```typescript
interface Fish { swim(): void }
interface Bird { fly(): void }

function isFish(animal: Fish | Bird): animal is Fish {
  return (animal as Fish).swim !== undefined
}

function move(animal: Fish | Bird) {
  if (isFish(animal)) {
    animal.swim() // ✅ 收窄为 Fish
  } else {
    animal.fly()
  }
}
```

## 可辨识联合

给联合类型的每个成员加一个共同的"判别"字段(如 `type`),配合 `switch` 收窄,这是 Redux、表单等场景的经典模式:

```typescript
type Event =
  | { type: 'click'; x: number; y: number }
  | { type: 'keydown'; key: string }
  | { type: 'load' }

function handle(event: Event) {
  switch (event.type) {
    case 'click':
      console.log(event.x, event.y) // 只有 click 分支有 x/y
      break
    case 'keydown':
      console.log(event.key)
      break
    case 'load':
      console.log('loaded')
      break
  }
}
```

## 条件类型

`T extends U ? X : Y` 让类型在"条件"里二选一,是类型层面的三元运算:

```typescript
type IsString<T> = T extends string ? true : false

type A = IsString<'hello'> // true
type B = IsString<42>      // false
```

配合 `infer` 还能从类型里"挖"出子类型:

```typescript
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T

type R = UnwrapPromise<Promise<string>> // string
```

## 映射类型

`in keyof` 遍历一个类型的每个键,生成新类型,是工具类型(下一篇)的实现基础:

```typescript
type ReadonlyAll<T> = {
  readonly [K in keyof T]: T[K]
}

interface User { name: string; age: number }
type ReadonlyUser = ReadonlyAll<User>
// { readonly name: string; readonly age: number }
```

再配合修饰符 `?`、`-?`、`-readonly` 可以做增删:

```typescript
type OptionalAll<T> = {
  [K in keyof T]?: T[K]
}
type MutableAll<T> = {
  -readonly [K in keyof T]: T[K]
}
```

## 索引访问类型

`T[K]` 直接取出属性的类型:

```typescript
interface User { name: string; age: number }
type Name = User['name']      // string
type All = User[keyof User]   // string | number
```

## 小结

- 联合/交叉是基础算子,守卫与谓词负责"收窄"
- 可辨识联合是处理分支数据的利器
- 条件类型 + `infer`、映射类型 + `in keyof` 打开了"类型编程"的大门

最后一篇把这些串起来,看看开箱即用的工具类型和工程化配置:[工具类型与工程化配置](/post/typescript-guide/ts-07-utility-types-engineering)。
