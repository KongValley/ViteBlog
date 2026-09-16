---
title: Python 入门（一）：从安装到第一个程序
date: 2026-09-16
tags:
  - Python
  - 入门
  - 环境配置
categories:
  - Python
excerpt: 从下载安装 Python、认识解释器，到创建项目目录并运行第一个脚本，完整走一遍 Python 开发的第一步。
---

## 为什么适合从 Python 开始

Python 的语法接近自然语言，不需要先理解复杂的类型声明，也不需要在开始时就面对大量样板代码。你可以先写出能运行的程序，再逐步理解背后的类型、作用域和面向对象概念。

它也很适合作为第一门编程语言：

- 标准库覆盖文件处理、网络请求、JSON 解析、压缩打包等常见需求；
- 社区生态庞大，数据分析、自动化、Web 开发、爬虫、AI 都有成熟工具；
- 报错信息相对清晰，遇到问题时容易搜索到答案。

## 安装 Python

Windows 用户建议直接到 [python.org](https://www.python.org/downloads/) 下载最新稳定版。安装时务必勾选：

> Add python.exe to PATH

这样终端才能直接识别 `python` 命令。安装完成后打开 PowerShell 或 CMD：

```powershell
python --version
```

如果显示类似 `Python 3.13.1` 的结果，说明安装成功。macOS 和 Linux 通常使用 `python3`：

```bash
python3 --version
```

有些系统会同时保留 Python 2 和 Python 3。写新项目时请始终使用 Python 3，不要再用 Python 2。

## 先和解释器打个招呼

在终端输入：

```bash
python
```

你会看到类似这样的提示符：

```text
Python 3.13.1 (main, ...) [MSC v.1941 ...] on win32
Type "help", "copyright", "credits" or "license" for more information.
>>>
```

这就是 Python 的交互式解释器，也叫 REPL。你输入一行代码，它会立刻执行并返回结果。试着输入：

```python
>>> 1 + 2
3
>>> "hello".upper()
'HELLO'
>>> print("你好，Python")
你好，Python
```

输入 `exit()` 可以退出 REPL。

## 创建第一个脚本

REPL 适合试验，真正的程序要保存成 `.py` 文件。新建一个项目目录，例如 `python-demo`，再创建 `hello.py`：

```python
name = "Python 学习者"
print(f"你好，{name}！")
print("今天是写代码的一天。")
```

保存后，在项目目录运行：

```powershell
python hello.py
```

输出：

```text
你好，Python 学习者！
今天是写代码的一天。
```

`f"你好，{name}！"` 是 f-string，大括号里的变量会被替换成实际值。

## 理解“解释执行”

Python 不是先像 C/C++ 那样编译成独立的可执行文件，而是由解释器读取源码并逐段执行。好处是修改后马上能运行，适合快速验证想法；缺点是通常需要目标机器上也具备 Python 环境，或者用 PyInstaller、Nuitka 等工具另行打包。

刚入门时不用纠结这些细节，先记住三件事：

1. 用 Python 3；
2. 源码文件的后缀是 `.py`；
3. 在终端里用 `python 文件名.py` 运行。

## 新手常见问题

### 1. `python` 不是内部或外部命令

通常是安装时没有加入 PATH。可以重新运行安装程序，勾选“Add python.exe to PATH”，或者使用 Windows 的 `py` 启动器。

### 2. 缩进报错

Python 用缩进表示代码块。不要混用 Tab 和空格，建议统一使用 4 个空格。

### 3. 文件名和内置模块重名

不要把脚本命名为 `random.py`、`json.py`、`os.py`，否则导入标准库时可能加载到你自己写的文件。

## 下一步

环境能跑起来后，就可以进入真正的语法部分：变量、数据类型、判断和循环。下一篇我们会把这些基础串成能处理输入输出的小程序。
