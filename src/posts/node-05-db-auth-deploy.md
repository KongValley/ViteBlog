---
title: Node.js 精通（五）：数据库、鉴权与部署上线
date: 2026-09-18
tags:
  - Node.js
  - 精通
  - Prisma
  - 部署
categories:
  - Node.js
excerpt: 用 Prisma 落库、JWT 鉴权、pino 记日志,最后 PM2/Docker/Nginx 部署上线——把 Node 服务带进生产环境。这是 Node.js 从入门到精通系列的收官篇。
---

前三篇的服务都活在内存和终端里,收官篇补上生产三大件:**持久化、鉴权、部署**。路线和 [Python 后端第五篇](/post/python-backend-05-db-auth-deploy)完全平行,概念一一对应,可以对照着读。

## 数据库:Prisma 三板斧

Node 生态当红的 ORM 是 **Prisma**:用一份 schema 文件描述数据,迁移、类型、客户端全部生成:

```bash
pnpm add prisma @prisma/client
pnpm prisma init        # 生成 prisma/schema.prisma 和 .env
```

```prisma
// prisma/schema.prisma
model Todo {
  id    Int     @id @default(autoincrement())
  title String
  done  Boolean @default(false)
}
```

```bash
pnpm prisma migrate dev --name init   # 生成迁移并建表(对应 Django 的 makemigrations+migrate)
```

业务代码里:

```js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const todo = await prisma.todo.create({ data: { title: "部署上线" } });
const open = await prisma.todo.findMany({ where: { done: false } });
await prisma.todo.update({ where: { id: 1 }, data: { done: true } });
```

查询结果自带 TS 类型,`where` 语法里嵌套关系过滤也是强类型的。嫌它"魔法"多可以看 **Drizzle**(更薄、SQL 味更浓)或直接用 `better-sqlite3` 写小工具。连接串在 `.env` 里,换 PostgreSQL 只改一行,和 [SQLAlchemy 那篇](/post/python-backend-05-db-auth-deploy)的连接串表格一个意思。

## 鉴权:哈希与 JWT

原则不变:**密码只存哈希,登录态用令牌**。Node 侧的实现:

```js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const digest = await bcrypt.hash(plain, 12);            // 注册:加盐哈希
const ok = await bcrypt.compare(plain, digest);         // 登录:比对

const token = jwt.sign({ sub: "42" }, process.env.JWT_SECRET, { expiresIn: "1h" });
const payload = jwt.verify(token, process.env.JWT_SECRET); // 过期/被改直接抛错
```

`JWT_SECRET` 从环境变量来,不进 git。Session 与 JWT 的取舍分析(无状态 vs 可吊销)直接看 [Python 篇的对照表](/post/python-backend-05-db-auth-deploy),结论通用。入参校验配 **zod**,一个 schema 同时完成校验和类型推导,是 Node 界的 Pydantic:

```js
import { z } from "zod";

const TodoInput = z.object({ title: z.string().min(1).max(50) });
const data = TodoInput.parse(req.body); // 不合格直接抛 400 语义的错误
```

**日志**用 `pino`(结构化 JSON,快):`logger.info({ todoId: 42 }, "已创建")`,别再手拼字符串。

## 部署:进程、容器、反代

生产环境不跑 `tsx watch`,结构照旧是"反代 → 应用进程 → Node":

**方案 A:PM2**(经典)。`cluster` 模式按 CPU 核数起多个进程分摊负载,崩溃自动拉起:

```bash
pnpm pm2 start dist/index.js -i max --name myapi
pnpm pm2 startup    # 开机自启
pnpm pm2 logs myapi
```

**方案 B:Docker**(更可复制)。多阶段构建,镜像里不带 devDependencies 和源码:

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER node
CMD ["node", "dist/index.js"]
```

前面永远站一台 **Nginx** 终结 HTTPS、托管静态文件、转发请求(`proxy_pass http://127.0.0.1:3000`,配置和 [Python 篇](/post/python-backend-05-db-auth-deploy)完全相同,不重复贴)。

最后两个生产细节:优雅停机——收到 SIGTERM 时先 `server.close()` 排空存量请求再退出,容器滚动更新才不会砍断用户;健康检查——留一个 `/health` 无鉴权路由给负载均衡探测,就是[第二篇](/post/node-02-core-modules-async)裸 http 版里写过的那个。

## 系列小结

五篇走完:**运行时与模块**(地基)→ **核心模块与异步**(心智模型)→ **框架**(Express/Fastify 选型)→ **工具链**(pnpm/TS/ESLint/Vitest)→ **生产三件套**(Prisma/JWT/部署)。和 Python 后端系列对照着看会发现:语言在变,"落库、鉴权、反代、容器"这些后端母题从没变过。接下来值得深入:消息队列(BullMQ)、缓存(Redis)、可观测性(OpenTelemetry)。

## 动手练习

1. 给待办 API 接上 Prisma(SQLite),重启进程后数据仍在;
2. 实现注册/登录:bcrypt 哈希入库,登录签发 1 小时 JWT,写一个校验 Bearer token 的 Fastify preHandler 钩子;
3. 写 Dockerfile 打包你的服务,`docker run -e JWT_SECRET=xxx` 起来后用 curl 走通登录全流程。
