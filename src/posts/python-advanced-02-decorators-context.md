---
title: Python 进阶（二）：装饰器与上下文管理器怎样管理横切逻辑
date: 2026-09-17
cover: /ViteBlog/images/covers/python-advanced-02-decorators-context.jpg
tags:
  - Python
  - 进阶
  - 装饰器
categories:
  - Python
excerpt: 用计时这个小需求理解函数装饰器、functools.wraps、with 协议和异常发生时的清理规则。
---

计时、记录日志、获取锁、关闭文件，这些逻辑经常围绕着业务代码出现。如果每个函数都手写一次“开始、执行、结束”，代码很快会被重复步骤淹没。

装饰器负责**包装函数调用**；上下文管理器负责**界定一段代码的进入和退出**。两者都适合处理这类横跨多处代码的需求，但使用位置不同。

本文示例适用于 Python 3.11 及以上版本。

## 函数也是值

Python 函数可以赋给变量，也可以作为参数传入。装饰器本质上就是“接收一个函数，返回另一个函数”。

```python
def announce(function):
    def wrapper():
        print("准备调用")
        return function()

    return wrapper


@announce
def greet():
    return "你好"


print(greet())
```

`@announce` 等价于定义完 `greet` 后执行 `greet = announce(greet)`。上面只是最小原理演示；真实装饰器还要支持参数，并保留原函数的名字和文档。

## 一个可复用的计时装饰器

```python
from functools import wraps
from time import perf_counter


def timed(function):
    @wraps(function)
    def wrapper(*args, **kwargs):
        start = perf_counter()
        try:
            return function(*args, **kwargs)
        finally:
            elapsed = perf_counter() - start
            print(f"{function.__name__} 耗时 {elapsed:.6f} 秒")

    return wrapper


@timed
def total(limit: int) -> int:
    """计算从 0 到 limit - 1 的整数之和。"""
    return sum(range(limit))


print(total(100_000))
print(total.__name__)  # total
```

`*args, **kwargs` 将任意位置参数和关键字参数传给原函数。`@wraps` 保留 `__name__`、文档等元信息，还通过 `__wrapped__` 指向原函数。`finally` 让计时信息在函数报错时也能打印，异常仍会向外传播。

这个装饰器包装的是**同步函数**。如果直接装饰 `async def`，测到的只会是创建协程对象的时间；异步函数需要一个 `async def wrapper` 并在其中 `await function(...)`。

## `with` 解决进入与退出的问题

`with` 最常见的用途是关闭文件。它依赖上下文管理器的 `__enter__` 和 `__exit__` 方法。我们也可以用 `contextlib.contextmanager` 写一个计时器：

```python
from contextlib import contextmanager
from time import perf_counter


@contextmanager
def timer(label: str):
    start = perf_counter()
    try:
        yield
    finally:
        print(f"{label} 耗时 {perf_counter() - start:.6f} 秒")


with timer("生成平方列表"):
    squares = [number * number for number in range(100_000)]

print(len(squares))
```

`yield` 前是进入代码块时执行的部分，`yield` 后是退出时执行的部分。无论代码块正常结束还是抛出异常，`finally` 都会执行。这里没有捕获异常，因此不会把错误悄悄吞掉。

## 什么时候用哪一个？

| 需求 | 更合适的工具 |
| --- | --- |
| 每次调用某个函数都要计时或记录日志 | 装饰器 |
| 只想测函数内部的一小段代码 | 上下文管理器 |
| 管理文件、锁、临时目录的生命周期 | 上下文管理器 |

不要为了“高级”而给所有函数加装饰器。调用链被多层包装后，阅读和调试都会变难。优先在重复逻辑明显、边界清楚的地方使用。

## 动手练习

把 `timer` 改成支持 `with timer("任务") as elapsed:`：让 `elapsed` 保存一个可调用函数，调用时返回已经过去的秒数。想一想为什么要返回函数，而不是在 `yield` 时直接返回一个浮点数。
