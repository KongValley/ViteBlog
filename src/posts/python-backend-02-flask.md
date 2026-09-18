---
title: Python 后端（二）：Flask 快速上手
date: 2026-09-18
tags:
  - Python
  - 后端
  - Flask
categories:
  - Python
excerpt: 从最小应用开始，把路由、请求解析、错误处理、蓝图组织一次讲清，动手写出一个完整的待办事项 API。这是 Python 后端系列的第二篇。
---

Flask 的核心小到只有一个文件也装得下，但正因为薄，它是最适合理解后端运作方式的框架。这一篇用它把[上一篇](/post/python-backend-01-http-wsgi-asgi)讲的请求—响应流水线真正跑起来，最后得到一个完整的待办事项 API。

先安装：

```bash
pip install flask
```

## 最小应用

```python
# app.py
from flask import Flask

app = Flask(__name__)


@app.get("/")
def index():
    return {"message": "待办事项 API"}


if __name__ == "__main__":
    app.run(debug=True)
```

运行 `python app.py`，访问 `http://127.0.0.1:8000`。`@app.get("/")` 把路径和函数绑在一起；函数直接返回字典，Flask 会自动转成 JSON（2.2 之后的版本支持）。

`debug=True` 打开调试模式：代码改动自动重启、出错时浏览器里能看到带交互式堆栈的报错页。**调试模式只能在本机开发用，绝对不要部署到公网**——报错页能执行任意代码。

## 路由：路径参数与请求方法

URL 里的动态部分用尖括号声明，还可以限定类型：

```python
@app.get("/api/todos/<int:todo_id>")
def get_todo(todo_id: int):
    return {"id": todo_id}
```

访问 `/api/todos/3` 时，`todo_id` 会被自动转成整数 `3`；访问 `/api/todos/abc` 则直接返回 404。常用的转换器还有 `string`、`path`、`uuid`。

上一节用的 `@app.get` 是快捷写法，等价于 `@app.route("/", methods=["GET"])`。REST 风格的接口通常这样配对：`GET` 读、`POST` 建、`PUT/PATCH` 改、`DELETE` 删。

## 读取请求：查询参数与 JSON

`flask.request` 是个全局代理对象，代表"当前这个请求"：

```python
from flask import request


@app.get("/api/todos")
def list_todos():
    # /api/todos?done=false&limit=10
    done = request.args.get("done")            # 字符串或 None
    limit = request.args.get("limit", default=10, type=int)
    return {"done": done, "limit": limit}


@app.post("/api/todos")
def create_todo():
    data = request.get_json(silent=True) or {}
    title = data.get("title", "").strip()
    if not title:
        return {"error": "title 不能为空"}, 400
    return {"id": 1, "title": title, "done": False}, 201
```

三个要点：查询参数一律是字符串，取数字要给 `type=int`；`get_json(silent=True)` 在请求体不是合法 JSON 时返回 `None` 而不是抛 400，便于自己组织错误信息；返回值写成 `(数据, 状态码)` 元组即可指定状态码，`201 Created` 表示新建成功。

## 错误处理：abort 与 errorhandler

业务里经常要"不满足条件就中断"，`abort` 专门干这个：

```python
from flask import abort

todos = [{"id": 1, "title": "学 Flask", "done": False}]


@app.get("/api/todos/<int:todo_id>")
def get_todo(todo_id: int):
    todo = next((t for t in todos if t["id"] == todo_id), None)
    if todo is None:
        abort(404, description="待办不存在")
    return todo
```

抛出的 HTTPException 默认会返回 Flask 自带的 HTML 错误页。前后端分离项目希望统一返回 JSON，用 `errorhandler` 接住：

```python
from flask import jsonify
from werkzeug.exceptions import HTTPException


@app.errorhandler(HTTPException)
def handle_exception(error: HTTPException):
    return jsonify(error=error.description), error.code
```

再配合一个兜底的 `@app.errorhandler(Exception)`，就能保证任何未预料异常都以 JSON 形式返回 500，而不是把堆栈暴露给调用方。

## 组装起来：一个完整的待办 API

```python
from flask import Flask, abort, jsonify, request
from werkzeug.exceptions import HTTPException

app = Flask(__name__)
todos: list[dict] = []


@app.get("/api/todos")
def list_todos():
    return jsonify(todos)


@app.post("/api/todos")
def create_todo():
    data = request.get_json(silent=True) or {}
    title = data.get("title", "").strip()
    if not title:
        abort(400, description="title 不能为空")
    todo = {
        "id": max((t["id"] for t in todos), default=0) + 1,
        "title": title,
        "done": False,
    }
    todos.append(todo)
    return jsonify(todo), 201


@app.patch("/api/todos/<int:todo_id>")
def toggle_todo(todo_id: int):
    todo = next((t for t in todos if t["id"] == todo_id), None)
    if todo is None:
        abort(404, description="待办不存在")
    todo["done"] = not todo["done"]
    return jsonify(todo)


@app.errorhandler(HTTPException)
def handle_exception(error: HTTPException):
    return jsonify(error=error.description), error.code
```

用 curl 走一遍完整流程：

```bash
curl -X POST http://127.0.0.1:8000/api/todos -H "Content-Type: application/json" -d '{"title": "买牛奶"}'
curl http://127.0.0.1:8000/api/todos
curl -X PATCH http://127.0.0.1:8000/api/todos/1
```

## 项目变大之后：蓝图与目录结构

所有代码挤在一个 `app.py` 里撑不了多久。**蓝图（Blueprint）** 把路由按功能拆开：

```python
# app/api/todos.py
from flask import Blueprint, jsonify

api = Blueprint("api", __name__, url_prefix="/api")


@api.get("/todos")
def list_todos():
    return jsonify([])
```

```python
# app/__init__.py —— 应用工厂
from flask import Flask


def create_app() -> Flask:
    app = Flask(__name__)
    from .api.todos import api
    app.register_blueprint(api)
    return app
```

```
myapp/
├── app/
│   ├── __init__.py        # create_app 应用工厂
│   ├── api/
│   │   ├── __init__.py
│   │   └── todos.py       # /api 前缀的蓝图
│   ├── templates/         # Jinja2 模板（如果渲染页面）
│   └── static/            # 静态文件
├── pyproject.toml
└── wsgi.py                # from app import create_app; application = create_app()
```

`create_app()` 这种"应用工厂"写法还有个好处：测试时可以传入不同配置创建独立的应用实例，互不干扰。

如果还需要服务端渲染页面，`render_template("index.html", todos=todos)` 会用 Jinja2 模板引擎渲染 `templates/` 下的文件，语法和 Django 模板接近：`{% raw %}{{ 变量 }}{% endraw %}` 取值、`{% raw %}{% for %}{% endraw %}` 循环、`{% raw %}{% extends %}{% endraw %}` 继承布局。

## 数据存哪儿？

目前待办存在内存里，进程一重启就清空。真实项目要落库——这正是后面要解决的问题，SQLAlchemy 的用法会在[第五篇](/post/python-backend-05-db-auth-deploy)展开。

## 动手练习

1. 给待办 API 补一个 `DELETE /api/todos/<int:todo_id>`，删除成功返回 `204 No Content`（注意：204 不能带响应体）；
2. 加一个查询过滤：`GET /api/todos?done=true` 只返回已完成的待办；
3. 把路由挪进蓝图，改造成应用工厂结构，确认 curl 测试结果不变。
