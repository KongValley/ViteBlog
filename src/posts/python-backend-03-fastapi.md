---
title: Python 后端（三）：FastAPI 与类型驱动开发
date: 2026-09-18
tags:
  - Python
  - Web 后端
categories:
  - Python
excerpt: 类型注解在这里不只是标注——它们自动变成参数校验、数据转换和交互式文档。用 Pydantic 和依赖注入重写待办 API。这是 Python 后端系列的第三篇。
---

FastAPI 是近几年 Python 社区增长最快的 Web 框架。它最核心的主张是：**你已经在写的类型注解，应该同时充当参数校验、数据转换和接口文档**。写完一个接口，校验逻辑和文档页面就"免费"得到了。

先安装，推荐带标准工具链的版本：

```bash
pip install "fastapi[standard]"
```

## 最小应用

```python
# main.py
from fastapi import FastAPI

app = FastAPI(title="待办事项 API")


@app.get("/")
def root():
    return {"message": "待办事项 API"}
```

```bash
fastapi dev main.py
```

开发服务器启动后，除了 `http://127.0.0.1:8000`，还有一个自动生成的交互式文档页面 `http://127.0.0.1:8000/docs`——基于 OpenAPI 规范，可以直接在浏览器里发请求调试。这个文档对前后端协作价值极大，前端同事不用问你就知道每个接口收什么、返回什么。

## 类型注解就是接口定义

```python
@app.get("/api/todos/{todo_id}")
def get_todo(todo_id: int, verbose: bool = False):
    return {"id": todo_id, "verbose": verbose}
```

没有手写任何解析代码，但 FastAPI 已经做了三件事：

1. `todo_id` 声明为 `int`，访问 `/api/todos/abc` 会自动返回结构化的 422 错误，告诉调用方"这个参数应该是整数"；
2. `verbose` 是 `bool` 且带默认值，被识别为查询参数，`?verbose=true` 会转成 Python 的 `True`；
3. 这两个参数连同类型说明，出现在 `/docs` 的文档里。

对照[第二篇](/post/python-backend-02-flask)里 Flask 的写法——`request.args.get("limit", default=10, type=int)`，FastAPI 把这些从函数体里搬到了签名上，函数本身保持纯净。

## 用 Pydantic 定义请求体

POST 的 JSON 请求体用 Pydantic 模型描述：

```python
from pydantic import BaseModel, Field


class TodoCreate(BaseModel):
    title: str = Field(min_length=1, max_length=50, description="待办标题")
    done: bool = False


class TodoOut(TodoCreate):
    id: int


@app.post("/api/todos", response_model=TodoOut, status_code=201)
def create_todo(data: TodoCreate):
    todo = TodoOut(id=1, **data.model_dump())
    return todo
```

`TodoCreate` 同时完成了四件事：**校验**（title 必须是 1–50 个字符，不合格自动返回 422 和具体哪个字段出错）、**类型转换**、**编辑器提示**（`data.` 之后 IDE 会补全字段）、**文档生成**（`/docs` 里出现带示例的请求体结构）。

`response_model=TodoOut` 则约束了**出口**：函数返回什么，最终响应里只会包含模型声明的字段。这对避免"不小心把内部字段（如密码哈希）序列化给用户"这类事故非常有效。

## 组装起来：同一个待办 API

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="待办事项 API")


class TodoCreate(BaseModel):
    title: str = Field(min_length=1, max_length=50)
    done: bool = False


class TodoUpdate(BaseModel):
    done: bool


class TodoOut(TodoCreate):
    id: int


todos: dict[int, TodoOut] = {}
next_id = 1


@app.get("/api/todos", response_model=list[TodoOut])
def list_todos():
    return list(todos.values())


@app.post("/api/todos", response_model=TodoOut, status_code=201)
def create_todo(data: TodoCreate):
    global next_id
    todo = TodoOut(id=next_id, **data.model_dump())
    todos[next_id] = todo
    next_id += 1
    return todo


@app.patch("/api/todos/{todo_id}", response_model=TodoOut)
def update_todo(todo_id: int, data: TodoUpdate):
    if todo_id not in todos:
        raise HTTPException(status_code=404, detail="待办不存在")
    todo = todos[todo_id].model_copy(update=data.model_dump())
    todos[todo_id] = todo
    return todo
```

错误处理用 `raise HTTPException(...)`，思路和 Flask 的 `abort` 一致，但抛的是普通异常——业务代码不需要耦合"如何构造响应"这个细节。

## 依赖注入：Depends

重复逻辑（分页参数、登录校验、数据库会话）在 FastAPI 里用**依赖**表达。依赖就是一个普通函数，声明在路径函数的参数里：

```python
from fastapi import Depends, Query


def pagination(skip: int = 0, limit: int = Query(default=10, le=100)):
    return {"skip": skip, "limit": limit}


@app.get("/api/todos")
def list_todos(page: dict = Depends(pagination)):
    return {"page": page}
```

`pagination` 的参数也会出现在文档里，`le=100` 表示上限 100。多个接口共享同一份分页逻辑，改一处全部生效。

鉴权依赖更典型——先校验，通过则把"当前用户"传给业务函数：

```python
from fastapi import Header, HTTPException


def current_user(x_token: str = Header()):
    if x_token != "secret-token":
        raise HTTPException(status_code=401, detail="无效 token")
    return {"username": "kong"}


@app.get("/api/me")
def me(user: dict = Depends(current_user)):
    return user
```

依赖还能嵌套（依赖里再 `Depends` 其他依赖），配合 `yield` 可以写出"请求开始时连接数据库、请求结束后自动关闭"的托管资源，官方文档里数据库会话就是这么管的。

## 什么时候写 async def

FastAPI 同时支持 `def` 和 `async def` 两种端点，规则很简单：

- 端点里全是 **CPU 计算**或调用**同步阻塞库**（如大多数 ORM、`requests`），就写 `def`——FastAPI 会把它丢进线程池，不会卡住事件循环；
- 端点里要 `await` 异步库（`httpx.AsyncClient`、`asyncpg`、异步 SQLAlchemy），才写 `async def`。

拿不准就写 `def`，它永远是对的（只是并发上限不如真正的异步高）。asyncio 的原理在[进阶系列第四篇](/post/python-advanced-04-asyncio)已经讲过，这里直接复用那个心智模型。

## 前后端分离必配：CORS

如果你的前端（比如一个 Vite 应用）部署在和 API 不同的域名下，浏览器会拦截跨域响应，后端要明确放行：

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

`allow_origins` 列出允许的前端来源，上线时换成正式域名，不要图省事写 `["*"]`。

## 动手练习

1. 给待办 API 加一个查询过滤接口：`GET /api/todos?done=true`，用查询参数类型注解实现；
2. 把分页依赖用到 `list_todos` 上，用 `/docs` 页面调试 `skip` 和 `limit`，故意传 `limit=999` 观察 422 响应的结构；
3. 把 `current_user` 依赖挂到 `create_todo` 上，用 curl 不带 `X-Token` 头请求一次，确认返回 401。
