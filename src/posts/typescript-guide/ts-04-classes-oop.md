---
title: TypeScript 进阶（四）：类与面向对象
date: 2026-09-19 10:30:00
tags:
  - TypeScript
  - 进阶
  - 面向对象
categories:
  - TypeScript
excerpt: 访问修饰符、继承、抽象类、接口实现……TypeScript 给 JS 的 class 加上了真正的类型约束。这是 TS 系列第四篇。
---

JS 从 ES6 起有了 `class`,但那只是原型链的语法糖,没有类型层面的约束。TS 的类才是完整的面向对象:字段要声明类型、访问要受控制、继承要符合契约。

## 基础类

```typescript
class Person {
  name: string
  age: number

  constructor(name: string, age: number) {
    this.name = name
    this.age = age
  }

  greet(): string {
    return `Hi, I'm ${this.name}`
  }
}

const p = new Person('Kong', 18)
console.log(p.greet())
```

注意:TS 要求先声明字段 `name: string`,再在构造器里赋值,和 JS 直接 `this.x = ...` 不同。

## 访问修饰符

`public` / `private` / `protected` 控制可见性:

```typescript
class Person {
  public name: string
  private secret: string
  protected nickname: string

  constructor(name: string) {
    this.name = name
    this.secret = 'secret'
    this.nickname = 'K'
  }
}

// p.secret      // ❌ 外部不可访问 private
// p.nickname    // ❌ 外部不可访问 protected
```

- `public`(默认):谁都能访问
- `private`:只有类自己内部能访问
- `protected`:类自己和子类能访问

> 注意 `private` 只是编译期的约束,编译成 JS 后属性仍然存在;想要运行时真正私有,可用 ES2022 的 `#` 私有字段。

## 构造器参数属性

把修饰符写在构造器参数上,可以省略字段声明和赋值两步:

```typescript
class Person {
  constructor(
    public name: string,
    private age: number,
  ) {}
}

const p = new Person('Kong', 18)
console.log(p.name) // ✅
// p.age           // ❌ private
```

## 继承与 super

用 `extends` 继承,用 `super` 调用父类构造器/方法:

```typescript
class Animal {
  constructor(public name: string) {}
  move(): string {
    return `${this.name} 在移动`
  }
}

class Dog extends Animal {
  constructor(name: string, public breed: string) {
    super(name) // 必须先调用父类构造器
  }

  move(): string {
    return `${super.move()},用四条腿`
  }
}
```

## 抽象类

`abstract` 类不能被实例化,只用来当"模板",抽象方法强制子类实现:

```typescript
abstract class Shape {
  abstract area(): number // 子类必须实现

  describe(): string {
    return `面积是 ${this.area()}`
  }
}

class Circle extends Shape {
  constructor(public radius: number) {
    super()
  }
  area(): number {
    return Math.PI * this.radius ** 2
  }
}
```

## implements 实现接口

接口描述"长得像什么",类用 `implements` 保证自己符合这个契约:

```typescript
interface Singer {
  sing(): void
}

class Bird implements Singer {
  sing(): void {
    console.log('叽叽喳喳')
  }
}
```

一个类可以同时 `implements` 多个接口,但只能 `extends` 一个父类。

## 装饰器(简介)

装饰器是给类/方法"打补丁"的语法,常见于框架(如 NestJS)。TS 5 已支持标准装饰器:

```typescript
function logged(target: Function) {
  console.log(`创建了类:${target.name}`)
}

@logged
class Service {}

// 输出:创建了类:Service
```

装饰器属于进阶话题,本系列不展开,用到时再深入。

## 小结

- 字段要声明类型,修饰符控制可见性
- `extends` 继承、`super` 调用父类、`abstract` 定义模板
- `implements` 保证类符合接口契约

下一篇进入 TS 最核心的抽象能力:[泛型](/post/typescript-guide/ts-05-generics)。
