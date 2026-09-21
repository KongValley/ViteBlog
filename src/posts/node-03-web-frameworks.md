---
title: Node.js 进阶（三）：Web 框架选型与实战
date: 2026-09-18
cover: /ViteBlog/images/covers/node-03-web-frameworks.jpg
tags:
  - Node.js
  - 进阶
  - Express
  - Fastify
categories:
  - Node.js
excerpt: Express、Fastify、Koa、NestJS、Hono 各是什么定位,中间件模型怎么运作——用同一个待办 API 实测主流框架。这是 Node.js 从入门到精通系列的第三篇。
---

裸 `http` 模块能跑,但每个项目都要重写路由分发、body 解析、错误兜底,没有道理。框架把这些固化成约定。这一篇用[和 Python 系列同一个待办 API](/post/python-backend-02-flask)过一遍主流选择,你会在两个生态间看到惊人的相似。

## 中间件:框架的灵魂

几乎所有 Node 框架的核心概念都是**中间件**(middleware):请求依次流过一串函数,每个函数可以读改请求数据、提前响应(短路),或把控制权交给下一个:

```
请求 → 日志中间件 → 鉴权中间件 → 路由处理函数 → 响应
```

日志、CORS、body 解析、静态文件……全是中间件。理解了这个,所有框架文档都不再陌生。

## Express:事实标准

```bash
npm install express
```

```js
import express from "express";

const app = express();
app.use(express.json()); // body 解析中间件

let todos = [];
let nextId = 1;

app.get("/api/todos", (req, res) => {
  res.json(todos);
});

app.get("/api/todos/:id", (req, res) => {
  const todo = todos.find((t) => t.id === Number(req.params.id));
  if (!todo) return res.status(404).json({ error: "待办不存在" });
  res.json(todo);
});

app.post("/api/todos", (req, res) => {
  const title = req.body?.title?.trim();
  if (!title) return res.status(400).json({ error: "title 不能为空" });
  const todo = { id: nextId++, title, done: false };
  todos.push(todo);
  res.status(201).json(todo);
});

// 四个参数的错误中间件,兜住整条链的异常
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "内部错误" });
});

app.listen(3000);
```

对照 [Flask 那篇](/post/python-backend-02-flask)的结构:`:id` 路径参数对应 Flask 的 `<int:todo_id>`,`res.status(404)` 对应 `abort(404)`,错误中间件对应 `errorhandler`。Express 5(当前的默认大版本)会自动把 async 路由的 rejection 转给错误中间件,不用再手动 `try/catch` 传递。

## Fastify:快,且自带装备

```js
import Fastify from "fastify";

const app = Fastify({ logger: true }); // 内置结构化日志

app.get("/api/todos", async () => todos);

app.post("/api/todos", async (req, reply) => {
  const title = req.body?.title?.trim();
  if (!title) return reply.code(400).send({ error: "title 不能为空" });
  const todo = { id: nextId++, title, done: false };
  todos.push(todo);
  return reply.code(201).send(todo);
});

await app.listen({ port: 3000 });
```

Fastify 的两个招牌:**性能**显著高于 Express(基准常见 2~3 倍);**JSON Schema 校验**——给路由挂上 schema,入参出参自动校验+序列化提速,思路和 [FastAPI 的 Pydantic](/post/python-backend-03-fastapi) 如出一辙,只是声明形式从类型注解换成了 JSON 对象。插件系统让路由、配置按功能隔离,组织大项目比 Express 舒服。

## Koa:洋葱模型

Koa(TJ 大神作品,Express 原班人马的新作)把中间件做成**洋葱**:`await next()` 之前的代码在请求阶段执行,之后的代码在响应阶段执行,天然形成"进与出"的对称结构:

```js
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();                          // 放行,等内层全部执行完
  ctx.set("X-Response-Time", `${Date.now() - start}ms`); // 回程再执行
});
```

在 Koa 里写"计时、捕获耗时"这类包裹型逻辑最自然。它本身极简,连路由都要装 `@koa/router`。

## NestJS 与 Hono:两个方向的代表

**NestJS** 是 Node 界的"Django":装饰器 + 依赖注入 + 模块化,自带架构约束,TypeScript 深度整合。适合大团队、长周期项目——学习成本高,但换人不必重学项目结构。

**Hono** 是近年黑马:超轻、极快、不绑定运行时——同一份代码能跑在 Node、Deno、Bun、Cloudflare Workers(边缘计算)上。想做 Serverless/边缘部署时它是首选。

## 怎么选

| 框架 | 一句话定位 | 适合 |
| --- | --- | --- |
| Express | 生态最大、资料最多、最稳 | 快速出活、老项目维护 |
| Fastify | 快、自带日志与校验、工程化好 | 新建 API 服务 |
| Koa | 洋葱中间件、极简 | 喜欢掌控、轻量服务 |
| NestJS | 全家桶、强架构、TS 深度绑定 | 中大型团队项目 |
| Hono | 多运行时、边缘友好 | Serverless / Workers |

没头绪就 **Fastify** 起步(新项目),需要庞大中间件生态时 Express 依然不会错。

## 动手练习

1. 把待办 API 补上 `PATCH` 和 `DELETE`,并给所有路由加一个打印耗时的时间日志中间件;
2. 用 Fastify 重写同款 API,开启 logger,对比日志输出格式;
3. 写一个"未登录返回 401"的鉴权中间件,只放行 `/api/todos` 路由,用 curl 验证短路效果。
