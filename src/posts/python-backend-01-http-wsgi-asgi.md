---
title: Python 后端（一）：HTTP、WSGI/ASGI 与框架选型
date: 2026-09-18
tags:
  - Python
  - Web 后端
categories:
  - Python
excerpt: 先看懂 HTTP 请求的生命周期，再手写一个不依赖框架的最小后端，最后对比 Flask、FastAPI、Django 该怎么选。这是 Python 后端系列的第一篇。
---

前几个系列把 Python 语言本身讲得差不多了，现在是把它放到"服务器"上的时候。所谓后端开发，本质就是写一个**常驻运行的程序**：监听网络端口，接收 HTTP 请求，执行业务逻辑，返回 HTTP 响应。框架只是把这个过程里重复的部分帮你封装了。

本文示例适用于 Python 3.11 及以上版本。

## 后端到底负责什么

一个典型的后端服务每天在做的就是这条流水线：

1. **接收请求**：从网络端口读到一个 HTTP 请求；
2. **解析**：弄清楚对方想访问哪个资源（URL）、用什么方式（GET/POST）、带了什么数据（请求头和请求体）；
3. **业务处理**：查数据库、做计算、调用第三方服务；
4. **构造响应**：把结果变成 JSON 或 HTML，配上状态码返回；
5. **记录日志与处理异常**：出了错不能直接崩掉进程。

所有的 Python Web 框架——Flask、FastAPI、Django——做的都是这件事，区别只在封装的厚度。

## 三分钟看懂 HTTP

HTTP 就是一段有固定格式的文本。浏览器访问一个待办列表接口时，实际发出去的内容长这样：

```
GET /api/todos?limit=10 HTTP/1.1
Host: example.com
Accept: application/json
```

第一行是**请求行**：方法 `GET`、路径 `/api/todos`、查询参数 `limit=10`。下面是若干**请求头**。如果是 POST，头部之后还有一个**请求体**，通常是一段 JSON。

服务器返回的内容：

```
HTTP/1.1 200 OK
Content-Type: application/json

[{"id": 1, "title": "学 Python 后端", "done": false}]
```

第一行是**状态行**：协议版本、状态码、短语。常用的状态码先记住这几个：`200` 成功、`201` 已创建、`400` 请求参数有误、`401` 未登录、`403` 无权限、`404` 资源不存在、`500` 服务器内部出错。

可以在命令行亲手发一个请求看原文：

```bash
curl -i https://httpbin.org/get
```

## 不用框架，先手写一个最小后端

Python 标准库自带 WSGI 参考 实现，不装任何第三方包就能跑起一个网站：

```python
def application(environ, start_response):
    path = environ.get("PATH_INFO", "/")
    if path == "/":
        body = "你好，后端世界".encode("utf-8")
        status = "200 OK"
    elif path == "/health":
        body = b"ok"
        status = "200 OK"
    else:
        body = b"Not Found"
        status = "404 Not Found"
    start_response(status, [("Content-Type", "text/plain; charset=utf-8")])
    return [body]


if __name__ == "__main__":
    from wsgiref.simple_server import make_server
    make_server("127.0.0.1", 8000, application).serve_forever()
```

运行后浏览器访问 `http://127.0.0.1:8000/` 就能看到文字。这段代码已经是一个货真价实的后端：`environ` 字典里装着解析好的请求信息，`start_response` 负责发送状态码和响应头，返回值就是响应体。

但很快你会遇到麻烦：判断路径要写一长串 `if`、解析查询参数要自己处理编码、返回 JSON 要手动 `json.dumps`、异常一抛整个请求就 500。**框架做的事情，就是把这些重复劳动变成声明式的代码。** 同样的路由逻辑，用 Flask 写只需要一个装饰器：

```python
from flask import Flask

app = Flask(__name__)


@app.get("/health")
def health():
    return "ok"
```

## 框架帮你做了哪些事

对照手写版本，成熟框架通常内置：

- **路由系统**：把 URL 模式映射到函数，支持路径参数如 `/todos/<int:id>`；
- **请求解析**：查询参数、表单、JSON 体、文件上传，统一封装成对象；
- **响应构造**：自动序列化 JSON、渲染模板、设置状态码；
- **中间件**：统一处理日志、跨域、鉴权这类"每个请求都要过一遍"的逻辑；
- **异常处理**：业务代码抛异常，框架兜底转成规范的错误响应。

## WSGI 与 ASGI：同步与异步的分界

上面手写的 `application(environ, start_response)` 就是 **WSGI** 协议——一个同步的网关接口，请求进来、处理完、返回，一个工作进程同一时刻只伺服一个请求。Flask 和 Django 的传统模式都构建在 WSGI 之上。

**ASGI** 是它的异步继任者，函数签名变成 `async def application(scope, receive, send)`，天然支持协程并发、WebSocket 和长连接。FastAPI 生来就是 ASGI 框架，Django 从 3.0 起也兼容 ASGI。

怎么选？记住[进阶系列讲过的结论](/post/python-advanced-04-asyncio)：异步带来的是 **I/O 并发能力**，不是单请求加速。大部分中小项目，同步框架加多进程部署完全够用；当你有大量并发的慢 I/O（调用第三方接口、推送消息）时，ASGI 才真正发光。

## Flask、FastAPI、Django 怎么选

| 框架 | 定位 | 上手难度 | 适合场景 |
| --- | --- | --- | --- |
| Flask | 微框架，核心极小，靠扩展补齐 | 低 | 小中型项目、API 服务、学习后端概念 |
| FastAPI | 现代异步框架，类型驱动 | 低到中 | API 服务、数据接口、需要自动文档的团队协作 |
| Django | 全家桶，ORM/Admin/认证全内置 | 中到高 | 内容型网站、需要管理后台和完整功能的项目 |

几条实用建议：

- **第一次学后端**，从 Flask 入手最好——它薄，你能看清每个请求经过了什么；
- **主要对外提供 JSON API**，尤其是前后端分离项目，选 FastAPI，类型注解直接变成接口文档和参数校验；
- **要快速做出带后台、带登录、带数据库管理的完整网站**，选 Django，它省下的时间远超学习成本；
- 三者并不互斥，团队里同时存在 Flask 老服务和 FastAPI 新服务非常常见。

## 动手练习

1. 把手写的 WSGI 应用扩展出一个 `/time` 路径，返回当前服务器时间的 JSON（提示：`json.dumps`、`datetime.now()`）；
2. 用 `curl -X POST -H "Content-Type: application/json" -d '{}'` 向它发一个 POST 请求，在代码里打印 `environ` 的键，找找请求体藏在哪个键里；
3. 装 Flask 把同样的两个路由重写一遍，感受一下框架省掉了什么。
