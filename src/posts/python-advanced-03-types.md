---
title: Python 进阶（三）：用 dataclass 和 Protocol 设计清晰的数据边界
date: 2026-09-17
tags:
  - Python
  - 进阶
  - 类型提示
categories:
  - Python
excerpt: 用不可变数据对象和结构化接口拆开业务逻辑与存储实现，同时认识类型提示在运行时的边界。
---

脚本只有几十行时，字典和函数已经够用。项目变大后，`task["done"]` 究竟是什么类型、某个函数依赖数据库还是内存列表，就不那么显然了。这时可以用 `dataclass` 表达数据，用 `Protocol` 表达函数需要的能力。

本文示例适用于 Python 3.11 及以上版本，只依赖标准库。

## 用 `dataclass` 表达一条记录

```python
from dataclasses import dataclass, replace


@dataclass(frozen=True, slots=True)
class Task:
    id: int
    title: str
    done: bool = False


task = Task(id=1, title="写一篇博客")
finished = replace(task, done=True)

print(task.done)      # False
print(finished.done)  # True
```

`dataclass` 自动生成初始化方法、表示形式和比较方法。`frozen=True` 阻止给字段重新赋值，`slots=True` 限制实例可用的属性并避免通常的实例 `__dict__`。要得到修改后的任务，可以用 `replace()` 创建新对象。

注意：`frozen=True` **不是深度不可变**。如果字段里放了列表，列表本身仍能修改。需要不可变集合时可优先选元组等不可变类型。

## 让函数依赖能力，而不是具体类

下面的业务函数只关心两件事：按编号读取任务，以及保存任务。它不必知道数据存在字典、文件还是数据库里。

```python
from dataclasses import dataclass, replace
from typing import Protocol


@dataclass(frozen=True, slots=True)
class Task:
    id: int
    title: str
    done: bool = False


class TaskStore(Protocol):
    def get(self, task_id: int) -> Task | None: ...
    def save(self, task: Task) -> None: ...


class MemoryTaskStore:
    def __init__(self) -> None:
        self._tasks: dict[int, Task] = {}

    def get(self, task_id: int) -> Task | None:
        return self._tasks.get(task_id)

    def save(self, task: Task) -> None:
        self._tasks[task.id] = task


def complete_task(store: TaskStore, task_id: int) -> Task:
    task = store.get(task_id)
    if task is None:
        raise LookupError(f"找不到任务 {task_id}")
    completed = replace(task, done=True)
    store.save(completed)
    return completed


store = MemoryTaskStore()
store.save(Task(1, "写一篇博客"))
print(complete_task(store, 1))
```

`MemoryTaskStore` 没有继承 `TaskStore`，但它实现了需要的方法，就符合这个协议。这叫**结构化类型**：关注对象会做什么，而不是它名义上属于哪一类。以后换存储实现时，`complete_task()` 不需要跟着改。

## 类型提示的边界

类型提示主要供编辑器和静态检查工具使用。Python 运行时不会因为标注了 `task_id: int` 就自动拒绝字符串，也不会自动检查某个类是否满足 `Protocol`。

因此，来自 JSON、命令行或网络的输入，仍应在边界处验证。比如：

```python
def parse_task_id(raw: str) -> int:
    try:
        task_id = int(raw)
    except ValueError as error:
        raise ValueError("任务编号必须是整数") from error
    if task_id <= 0:
        raise ValueError("任务编号必须大于 0")
    return task_id
```

这样，业务函数收到的才是符合约定的数据。类型提示写给开发工具看，运行时验证负责处理外部世界的不确定性。

## 什么时候值得这样设计？

如果只是一次性的十行脚本，增加协议和数据类可能太重；当多个函数共享同一数据结构，或存储方式可能变化时，这种边界会让修改更局部。

可以从一个实际痛点开始：先给核心数据建 `dataclass`，再给反复使用的依赖抽出 `Protocol`。不必为了“类型完整”一次性重写整个项目。

## 动手练习

实现一个 `JsonTaskStore`，用 JSON 文件保存任务，同时保持 `complete_task()` 不变。思考两个问题：JSON 读出来的字段如何验证？保存文件中途失败时如何避免覆盖掉原数据？
