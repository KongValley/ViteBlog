---
title: Python 进阶（一）：迭代器、生成器与惰性数据管道
date: 2026-09-17
tags:
  - Python
categories:
  - Python
excerpt: 从迭代协议出发，用 yield 逐条处理数据；再看生成器的资源生命周期，以及什么时候不该追求惰性。
---

处理十万行日志时，先把全部内容读进列表通常没有必要。我们真正需要的，往往只是“下一条”。迭代器和生成器正是用来表达这种逐条生产、逐条消费的过程。

本文示例适用于 Python 3.11 及以上版本。

## 先弄清可迭代对象和迭代器

列表是**可迭代对象**：调用 `iter()` 会得到迭代器。迭代器通过 `next()` 返回下一个值；没有值时抛出 `StopIteration`，`for` 循环会替你处理这个异常。

```python
numbers = [10, 20]
iterator = iter(numbers)

print(next(iterator))  # 10
print(next(iterator))  # 20

try:
    next(iterator)
except StopIteration:
    print("已经遍历完毕")
```

一个对象只要能提供 `__iter__()`，就可以放进 `for` 循环；迭代器还要提供 `__next__()`。通常不必手写这两个方法，因为生成器更简洁。

## 用 `yield` 按需产出数据

函数中出现 `yield`，调用它就会得到一个生成器对象。**调用时不会立即执行函数体**；每次请求下一个值，代码才继续运行到下一处 `yield`。

```python
def squares(limit: int):
    for number in range(limit):
        print(f"计算 {number} 的平方")
        yield number * number


items = squares(3)  # 此时还没有计算
print(next(items))   # 先打印“计算 0 的平方”，再打印 0
print(list(items))   # [1, 4]；前面的 0 已经消费掉了
```

生成器保存的是执行位置和局部状态，不会像 `list(...)` 那样预先保存所有结果。它通常只能按顺序消费一次：迭代完后，想重新读取就要重新创建。

## 把处理步骤连成管道

假设有一组文本行，要筛出告警并提取消息。每一步只处理收到的当前行：

```python
from collections.abc import Iterable, Iterator


def nonempty(lines: Iterable[str]) -> Iterator[str]:
    for line in lines:
        stripped = line.strip()
        if stripped:
            yield stripped


def warnings(lines: Iterable[str]) -> Iterator[str]:
    for line in lines:
        if line.startswith("WARN:"):
            yield line.removeprefix("WARN:").strip()


raw = ["INFO: ready\n", "\n", "WARN: disk almost full\n", "WARN: retry\n"]
for message in warnings(nonempty(raw)):
    print(message)
```

输出是 `disk almost full` 和 `retry`。管道的好处是每一步都能独立测试，也能换成真实文件输入，而不用改筛选逻辑。

## 读取文件时，谁负责关闭文件？

生成器可以从文件逐行产出数据，但文件的关闭时机不能含糊。最直接的方式是在消费方打开文件，并在 `with` 块内**完成消费**：

```python
from pathlib import Path


def nonempty(lines):
    for line in lines:
        if line.strip():
            yield line.strip()


def warnings(lines):
    for line in lines:
        if line.startswith("WARN:"):
            yield line.removeprefix("WARN:").strip()


path = Path("app.log")
with path.open("r", encoding="utf-8") as file:
    for message in warnings(nonempty(file)):
        print(message)
```

离开 `with` 后文件就关闭了。不要把 `warnings(nonempty(file))` 留到块外再迭代，否则读取时会遇到已关闭的文件。若生成器自己打开文件、消费者却提前停止迭代，也要额外考虑何时关闭生成器及其持有的文件。

## 什么时候该转回列表？

惰性计算适合顺序处理、数据量较大、可能提前停止的场景。但以下情况更适合直接用列表：

- 需要反复遍历同一批结果；
- 需要随机访问，例如 `items[10]`；
- 数据很小，列表让代码更容易理解。

一个简单准则是：**先让数据流动起来，需要重复使用时再把它物化成列表**。例如 `matches = list(warnings(nonempty(raw)))`，这里的内存开销就由你明确决定。

## 动手练习

写一个生成器，从文本行中筛出以 `ERROR:` 开头的消息；再用 `itertools.islice()` 只取前 3 条。试着在生成器里打印调试信息，观察后面的行有没有被读取。
