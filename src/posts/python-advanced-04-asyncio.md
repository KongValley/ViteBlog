---
title: Python 进阶（四）：用 asyncio 管理并发 I/O
date: 2026-09-17
tags:
  - Python
  - 进阶
  - asyncio
categories:
  - Python
excerpt: 通过可运行的模拟请求，理解协程、TaskGroup、并发上限、超时与取消；分清并发 I/O 和 CPU 计算。
---

假设要等待十个网络请求。如果一个请求等 1 秒，逐个等待可能要 10 秒；让它们同时等待，耗时可能接近最慢的那一个。`asyncio` 擅长的正是这种**等待期间可以去做别的事**的 I/O 场景。

本文示例要求 **Python 3.11 及以上**，因为使用了 `asyncio.TaskGroup`。示例用 `asyncio.sleep()` 模拟 I/O，不依赖网络或第三方库。

## 协程需要被运行

`async def` 定义协程函数。调用它会得到协程对象；只有被 `await`、任务或事件循环驱动，函数体才会真正执行。

```python
import asyncio


async def fetch(name: str, delay: float) -> str:
    await asyncio.sleep(delay)  # 模拟等待网络响应
    return f"{name} 完成"


async def main() -> None:
    result = await fetch("A", 0.1)
    print(result)


asyncio.run(main())
```

`await` 表示当前协程暂时让出执行机会。`time.sleep()` 则会阻塞当前线程，不适合放在事件循环里模拟异步等待。

## 用 `TaskGroup` 一起运行多个任务

```python
import asyncio


async def fetch(name: str, delay: float) -> str:
    await asyncio.sleep(delay)
    return f"{name} 完成"


async def main() -> None:
    async with asyncio.TaskGroup() as group:
        tasks = [
            group.create_task(fetch("A", 0.3)),
            group.create_task(fetch("B", 0.1)),
            group.create_task(fetch("C", 0.2)),
        ]

    # 离开 TaskGroup 后，组内任务都已结束；结果按 tasks 列表顺序读取。
    print([task.result() for task in tasks])


asyncio.run(main())
```

这里大约等待 0.3 秒，而不是把三个等待时间相加。`TaskGroup` 管理任务的生命周期：其中一个任务发生未处理的普通异常时，其他仍在运行的任务会被取消，退出时会把错误汇总抛出。这比创建任务后忘记等待它们更容易维护。

## 并发数量要设上限

一次发起几千个外部请求通常不是好主意。可以用信号量限制同时执行的任务数：

```python
import asyncio


async def fetch(number: int, limit: asyncio.Semaphore) -> str:
    async with limit:
        print(f"开始 {number}")
        await asyncio.sleep(0.1)  # 在真实项目里替换成异步 I/O
        return f"结果 {number}"


async def main() -> None:
    limit = asyncio.Semaphore(2)
    async with asyncio.TaskGroup() as group:
        tasks = [group.create_task(fetch(n, limit)) for n in range(5)]
    print([task.result() for task in tasks])


asyncio.run(main())
```

虽然创建了五个任务，但同时处于 `async with limit` 内的最多只有两个。实际项目中还要遵守服务端限流规则；信号量控制的是本地并发量，不保证对方一定接受请求。

## 超时与取消

无限等待会让服务看起来“卡死”。Python 3.11 可以用 `asyncio.timeout()` 给一段操作设期限：

```python
import asyncio


async def main() -> None:
    try:
        async with asyncio.timeout(0.1):
            await asyncio.sleep(1)
    except TimeoutError:
        print("操作超时")


asyncio.run(main())
```

超时依赖取消机制。清理资源时可以在 `finally` 中处理，但不要随意吞掉 `asyncio.CancelledError`，否则任务组和超时控制可能无法按预期工作。网络请求、数据库连接等资源也应使用对应库提供的异步上下文管理器妥善关闭。

## 并发不是自动加速一切

`asyncio` 对等待网络、数据库、磁盘等 I/O 很有帮助；纯 Python 的大量计算不会因为加了 `async` 就自动变快。计算密集型工作要单独评估多进程或专门的计算库。同步阻塞库也不会因为放进协程函数就变成异步库。

一个稳妥的起点是：先找出真正的等待点，再选择支持 `await` 的 I/O 库，最后补上并发上限、超时和错误处理。

## 动手练习

在并发示例中，让 `fetch(3, limit)` 抛出 `ValueError`。观察其他任务的状态，再用 `except* ValueError` 捕获任务组抛出的异常组。想一想哪些任务可能已经完成，哪些任务会被取消。
