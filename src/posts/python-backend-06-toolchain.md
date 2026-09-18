---
title: Python 后端（六）：工具链——uv、ruff 与 pytest
date: 2026-09-18
tags:
  - Python
  - Web 后端
  - 工具链
categories:
  - Python
excerpt: 用 uv 管依赖和 Python 版本,ruff 一个工具搞定 lint 加格式化,pytest 写测试,pre-commit 把关提交——把 Python 项目的工程质量管起来。这是 Python 后端系列的收官补充篇。
---

前五篇把功能做出来了,这一篇解决"怎么把质量管住":依赖版本失控、有人用 black 有人用 flake8、没有测试全靠手点——这些问题的解法是工具链。Node 侧的对应一篇在 [Node 工具链](/post/node-04-toolchain),两边概念几乎一一对应。

## 依赖管理:uv 一统

pip + requirements.txt 时代的痛点:装得慢、环境漂移(锁不精确)、虚拟环境要手动激活。2024 年 Astral 开源了 **uv**(Rust 实现),把这些问题一口气解决,如今已是新项目的默认选择:

```bash
uv init myapp            # 初始化项目,生成 pyproject.toml + .venv
cd myapp
uv add fastapi uvicorn   # 添加依赖并写入 pyproject.toml,自动生成 uv.lock
uv run uvicorn main:app  # run 会自动同步环境后执行,不用手动激活 venv
```

几个关键点:

- **uv.lock 是精确锁文件**,提交进 git,任何人 `uv sync` 都能重建出完全一致的环境(对应 Node 的 `package-lock.json`/`pnpm-lock.yaml`);
- **Python 版本也归它管**:`uv python install 3.12`、`uv python pin 3.12` 写进项目,不同项目各用各的版本,不再依赖系统 Python;
- 临时跑工具用 `uvx`:`uvx ruff check .` 不污染环境(对应 `pnpm dlx`/`npx`);
- 速度:纯 pip 装依赖几十秒的项目,uv 通常秒级完成。

老项目继续用 `python -m venv` + `pip freeze` 完全可以,但新项目没有理由不用 uv。

## ruff:lint 和 format 二合一

一个工具替代 flake8 + isort + black + pyupgrade 等,还是 Rust 写的,毫秒级跑完:

```bash
uv add --dev ruff
uv run ruff check . --fix   # 检查并自动修复
uv run ruff format .        # 统一格式(等同 black)
```

配置就写在 `pyproject.toml` 里:

```toml
[tool.ruff]
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "I", "B", "UP"]
# E/F 基础错误, I 排序 import, B 常见陷阱, UP 升级到现代写法
```

## 类型检查:mypy

[FastAPI 篇](/post/python-backend-03-fastapi)说过类型注解是框架的校验来源,但注解本身对不对,要靠独立的类型检查器把关:

```bash
uv add --dev mypy
uv run mypy .
```

```python
def get_price(plan_id: int) -> float:
    return PRICES[plan_id]

get_price("glm")   # mypy: Argument 1 has incompatible type "str"; expected "int"
```

老代码不用一口气补全类型,mypy 支持渐进式:从核心模块开始标注,慢慢扩散。这类"类型错了但运行时才炸"的问题,fastapi 开发期就能被拦住。

## pytest:测试的事实标准

Python 测试几乎等于 pytest:`test_` 开头的函数自动被发现,断言就是普通 `assert`,失败时会打印出完整表达式:

```python
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)   # pip 装好 httpx 即可用,不用起真实服务器


def test_create_todo():
    resp = client.post("/api/todos", json={"title": "写测试"})
    assert resp.status_code == 201
    assert resp.json()["done"] is False


def test_empty_title_rejected():
    resp = client.post("/api/todos", json={"title": "  "})
    assert resp.status_code == 400
```

`TestClient` 直接调用[第二篇](/post/python-backend-02-flask)写的待办 API,内存里走完"请求 → 应用 → 响应",飞快。两个最有用的能力:

```python
import pytest


@pytest.fixture
def todos():
    """每个测试前准备一份干净的种子数据,测完自动清理"""
    store = [{"id": 1, "title": "样本", "done": False}]
    yield store
    store.clear()


@pytest.mark.parametrize("bad_title", ["", "   ", None])
def test_bad_titles(bad_title):
    resp = client.post("/api/todos", json={"title": bad_title})
    assert resp.status_code == 400
```

fixture 管"测试的前置条件",parametrize 让一条测试逻辑跑 N 组数据——场景测试就不再复制粘贴了。

## pre-commit:提交前的自动关卡

工具再好,不跑等于没装。pre-commit 让检查在 `git commit` 时自动执行,不合格直接拦下:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.8.0
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format
```

```bash
uv add --dev pre-commit
uv run pre-commit install           # 之后每次 commit 自动跑
uv run pre-commit run --all-files   # 存量代码先全量过一遍
```

再往上一层是 CI:GitHub Actions 里装 uv、跑 `ruff check` + `mypy` + `pytest`,不过不许合并——本仓库的部署流水线就是这么把关的。

## pyproject.toml:一切配置的中枢

现代 Python 项目的所有元数据和工具配置集中在这一个文件里:

```toml
[project]
name = "myapi"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = ["fastapi>=0.115", "uvicorn>=0.32"]

[dependency-groups]
dev = ["ruff>=0.8", "mypy>=1.13", "pytest>=8.3"]

[tool.ruff]
line-length = 100

[tool.mypy]
python_version = "3.12"
```

对照 [Node 工具链篇](/post/node-04-toolchain)的 scripts 收口:Python 侧可以用任务运行器(如 taskipy)或直接 `uv run xxx`,习惯不同,目标一致——新人克隆仓库,一条命令装环境,两条命令跑测试,`git diff` 里永远没有格式噪音。

## 动手练习

1. 用 `uv init` 起一个干净项目,把[第二篇](/post/python-backend-02-flask)的待办 API 迁进去,体验 `uv add` 与 `uv run`;
2. 故意写一段 import 乱序、超长行、用了 `is` 比较字符串的代码,让 `ruff check --fix` 修一遍,再看 `git diff`;
3. 给待办 API 写测试:正常创建、空标题 400、`toggle` 两次恢复原状,再配一个 fixture 提供种子数据。
