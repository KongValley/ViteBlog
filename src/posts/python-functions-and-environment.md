---
title: Python 入门（三）：函数、异常、模块与虚拟环境
date: 2026-09-16
tags:
  - Python
  - 入门
  - 函数
  - 虚拟环境
categories:
  - Python
excerpt: 把重复逻辑整理成函数，处理运行时错误，使用模块拆分代码，并用虚拟环境隔离每个 Python 项目的依赖。
---

## 为什么需要函数

当代码越写越长，重复出现的逻辑就应该放进函数。函数让程序更容易阅读，也更方便测试和修改。

最简单的函数：

```python
def greet():
    print("你好")


greet()
```

带参数和返回值：

```python
def add(a, b):
    return a + b


result = add(3, 5)
print(result)
```

## 参数和返回值

函数可以有多个参数，也可以有默认值：

```python
def introduce(name, city="未知"):
    return f"{name} 来自 {city}"


print(introduce("小明"))
print(introduce("小红", "上海"))
```

调用时也可以写清楚参数名：

```python
print(introduce(city="北京", name="小刚"))
```

函数没有写 `return` 时，默认返回 `None`：

```python
def show():
    print("hello")


value = show()
print(value)  # None
```

## 类型提示

Python 变量本身不强制类型，但可以写类型提示，让代码更清楚：

```python
def average(scores: list[int]) -> float:
    if not scores:
        return 0.0
    return sum(scores) / len(scores)


print(average([88, 92, 75]))
```

类型提示不是运行时强校验，但编辑器能据此提示错误，团队项目里非常推荐使用。

## 小心可变默认参数

这是一个经典陷阱：

```python
def add_item_wrong(item, items=[]):
    items.append(item)
    return items


print(add_item_wrong("a"))
print(add_item_wrong("b"))
```

输出：

```text
['a']
['a', 'b']
```

默认参数 `[]` 只在函数定义时创建一次，后续调用会复用同一个列表。更安全的写法：

```python
def add_item(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items
```

## 异常处理

程序运行时会遇到不确定情况：文件不存在、用户输入了非数字、网络中断。异常处理可以让程序给出清晰提示，而不是直接崩溃。

```python
try:
    raw = input("请输入数字：")
    number = float(raw)
    print(f"你输入的是 {number}")
except ValueError:
    print("输入无效，请输入数字。")
```

可以同时处理多种异常：

```python
try:
    a = float(input("第一个数字："))
    b = float(input("第二个数字："))
    print(a / b)
except ValueError:
    print("请输入有效数字。")
except ZeroDivisionError:
    print("除数不能为 0。")
```

`finally` 里的代码无论如何都会执行：

```python
try:
    file = open("notes.txt", "r", encoding="utf-8")
    print(file.read())
except FileNotFoundError:
    print("文件不存在。")
finally:
    print("读取流程结束。")
```

处理文件更推荐 `with`，它会自动关闭文件：

```python
try:
    with open("notes.txt", "r", encoding="utf-8") as file:
        print(file.read())
except FileNotFoundError:
    print("文件不存在。")
```

## 自己抛出异常

如果参数不符合业务规则，可以用 `raise`：

```python
def set_age(age: int) -> int:
    if age < 0:
        raise ValueError("年龄不能小于 0")
    return age


try:
    set_age(-1)
except ValueError as error:
    print(error)
```

## 模块和包

当代码超过几百行，就该拆分成多个文件。一个 `.py` 文件就是一个模块。

创建 `math_tools.py`：

```python
def add(a: float, b: float) -> float:
    return a + b


def divide(a: float, b: float) -> float:
    if b == 0:
        raise ValueError("除数不能为 0")
    return a / b
```

在 `main.py` 中导入：

```python
import math_tools


print(math_tools.add(1, 2))
print(math_tools.divide(10, 2))
```

也可以只导入函数：

```python
from math_tools import add, divide


print(add(1, 2))
```

目录加一个 `__init__.py` 文件后，就可以形成包：

```text
my_project/
  main.py
  utils/
    __init__.py
    text.py
```

`main.py` 中：

```python
from utils.text import clean_title


print(clean_title("  Python 入门  "))
```

## 标准库先找一找

很多需求不需要立刻安装第三方库。常用标准库包括：

| 模块 | 用途 |
| --- | --- |
| `math` | 数学计算 |
| `random` | 随机数 |
| `datetime` | 日期和时间 |
| `json` | JSON 解析和生成 |
| `pathlib` | 文件路径处理 |
| `os` | 操作系统和环境变量 |

比如生成随机数：

```python
import random


number = random.randint(1, 100)
print(number)
```

处理日期：

```python
from datetime import date


today = date.today()
print(today.isoformat())
```

## 虚拟环境：让项目依赖互不干扰

不同项目可能需要不同版本的库。虚拟环境会给每个项目一个独立的包安装空间。

在项目根目录创建：

```powershell
python -m venv .venv
```

Windows PowerShell 激活：

```powershell
.\.venv\Scripts\Activate.ps1
```

macOS/Linux 激活：

```bash
source .venv/bin/activate
```

激活后，终端前面通常会出现 `(.venv)`。这时安装的包只属于当前项目：

```bash
pip install requests
```

导出依赖：

```bash
pip freeze > requirements.txt
```

其他机器安装依赖：

```bash
pip install -r requirements.txt
```

退出虚拟环境：

```bash
deactivate
```

`.venv/` 目录不应该提交到 Git，可以加入 `.gitignore`。

## 一个小项目：待办清单

创建 `todo.py`：

```python
import json
from pathlib import Path


DATA_FILE = Path("todos.json")


def load_todos() -> list[str]:
    if not DATA_FILE.exists():
        return []

    with DATA_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)


def save_todos(todos: list[str]) -> None:
    with DATA_FILE.open("w", encoding="utf-8") as file:
        json.dump(todos, file, ensure_ascii=False, indent=2)


def show_todos(todos: list[str]) -> None:
    if not todos:
        print("当前没有待办事项。")
        return

    for index, todo in enumerate(todos, start=1):
        print(f"{index}. {todo}")


def main() -> None:
    todos = load_todos()

    while True:
        print("\n1. 查看待办")
        print("2. 添加待办")
        print("3. 删除待办")
        print("4. 退出")
        choice = input("请选择：")

        if choice == "1":
            show_todos(todos)
        elif choice == "2":
            todo = input("请输入待办内容：")
            todos.append(todo)
            save_todos(todos)
        elif choice == "3":
            show_todos(todos)
            index = input("请输入要删除的编号：")

            try:
                todos.pop(int(index) - 1)
                save_todos(todos)
            except (ValueError, IndexError):
                print("编号无效。")
        elif choice == "4":
            break
        else:
            print("请输入 1-4。")


if __name__ == "__main__":
    main()
```

运行：

```bash
python todo.py
```

这个例子用到了函数、列表、字典式流程、异常处理、标准库模块和入口判断，是很适合初学者的综合练习。

## 后续学习路线

掌握这三篇的内容后，可以按这个顺序继续：

1. 面向对象：类、实例、属性、方法；
2. 文件与数据：CSV、JSON、路径处理；
3. 常用库：`requests`、`pandas`、`rich`；
4. 小工具实战：批量重命名、数据统计、定时提醒；
5. 测试：用 `pytest` 写单元测试。

不要一开始就追求复杂项目。先把小工具写完整，再逐步增加功能。
