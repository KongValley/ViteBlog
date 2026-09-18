---
title: Python 后端（五）：数据库、鉴权与部署上线
date: 2026-09-18
tags:
  - Python
  - 后端
  - SQLAlchemy
  - 部署
categories:
  - Python
excerpt: 数据落到 PostgreSQL，密码哈希存储，登录态用 Session 或 JWT，最后用 Gunicorn/Uvicorn 加 Nginx 部署上线——把 API 从本机带到生产环境。这是 Python 后端系列的收官篇。
---

前四篇的代码都活在内存和开发服务器里：数据一重启就没了，服务一断线就下线。这一篇补上生产环境的三大件——**持久化数据库、登录鉴权、部署上线**。示例以 FastAPI 为主线，思路对 Flask 同样适用。

## 把数据落进真正的数据库

开发时用 SQLite 很方便，但生产环境应该用 PostgreSQL 或 MySQL：更好的并发、更完整的类型系统和运维工具。框架 ORM 换数据库通常只需要改连接串：

```
sqlite:///blog.db
postgresql+psycopg://user:password@localhost:5432/blog
mysql+pymysql://user:password@localhost:3306/blog
```

独立于框架时，事实标准是 **SQLAlchemy**（Django 自带 ORM，思路一致）。2.0 风格的模型写法：

```python
# pip install "sqlalchemy>=2.0"
from sqlalchemy import String, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column

engine = create_engine("postgresql+psycopg://user:password@localhost:5432/blog")


class Base(DeclarativeBase):
    pass


class Todo(Base):
    __tablename__ = "todos"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(50))
    done: Mapped[bool] = False


Base.metadata.create_all(engine)   # 演示用；生产建议用 Alembic 管理迁移
```

增查的标准姿势是走 `Session`：

```python
with Session(engine) as session:
    session.add(Todo(title="部署上线"))
    session.commit()

with Session(engine) as session:
    stmt = select(Todo).where(Todo.done == False).order_by(Todo.id)  # noqa: E712
    for todo in session.scalars(stmt):
        print(todo.id, todo.title)
```

两个安全底线：ORM 的查询是**参数化**的，永远不会被 SQL 注入——但一旦自己写原生 SQL（`session.execute(text(...))`），就绝不能用 f-string 拼接用户输入；连接对象（`engine`）应该**全局创建一次**复用，它内部自带连接池，而不是每个请求新建一个。

## 密码永远不明文存储

注册和登录的第一课：数据库里只能存密码的**哈希**，不能存原文。万一库被拖走，攻击者拿到的也只是哈希值。用 bcrypt：

```python
# pip install bcrypt
import bcrypt


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())
```

`gensalt()` 每次生成随机盐，同一个密码两次哈希结果也不同，这正是防彩虹表的关键。校验时 `checkpw` 从哈希串里读出盐再重算。同样的原则也适用于 JWT 签名密钥、数据库密码——它们不该出现在代码里，见文末的环境变量部分。

## 登录态：Session 还是 JWT

用户登录成功后，后续请求怎么证明"我是我"？两种主流方案。

**Session（会话）方案**：登录后服务端存一份会话数据，把会话 ID 放进 `Set-Cookie` 返回；浏览器后续自动带上 Cookie，服务端查会话即知身份。

```
登录 → 服务端存 session["user_id"]=42 → 响应 Set-Cookie: sessionid=xxx
后续 → Cookie 自动携带 → 服务端查 session 得到 user_id
```

**JWT（JSON Web Token）方案**：登录后服务端签发一个自包含的令牌，里面直接写着用户 ID 和过期时间，由签名保证不可篡改；服务端**不用存任何东西**，验签即可。

```python
# pip install pyjwt
import time

import jwt

SECRET = "从环境变量读取，不要写死在代码里"

token = jwt.encode(
    {"sub": "42", "exp": int(time.time()) + 3600},
    SECRET,
    algorithm="HS256",
)
payload = jwt.decode(token, SECRET, algorithms=["HS256"])  # 过期或被改会抛异常
```

怎么选：

| | Session | JWT |
| --- | --- | --- |
| 状态存储 | 服务端（内存/Redis） | 无状态，令牌自带 |
| 注销/封禁 | 删掉服务端会话，立即生效 | 签发出去就有效到期，需要黑名单机制 |
| 典型场景 | 传统服务端渲染网站、单体内系统 | 前后端分离、移动端、微服务间传递身份 |

不是二选一：很多系统用"短命 JWT + 服务端可吊销的 Refresh Token"取两者之长。另外无论哪种方案，**Cookie 记得配 `HttpOnly` 和 `Secure`**，防脚本偷令牌。

## 部署：开发服务器不能上生产

`flask run`、`uvicorn --reload`、`runserver` 都是开发工具：单进程、无守护、性能未调优。生产部署的标准结构是两层：

```
互联网 → Nginx（反向代理）→ 应用服务器（多进程）→ 你的 Python 应用
```

**应用服务器**负责把你的应用跑成可靠的多进程服务。WSGI 应用用 Gunicorn，ASGI 应用用 Uvicorn：

```bash
pip install gunicorn
gunicorn -w 4 -b 127.0.0.1:8000 "app:create_app()"     # Flask：4 个工作进程

pip install uvicorn
uvicorn main:app --host 127.0.0.1 --port 8000 --workers 4   # FastAPI
```

进程数常取 `CPU 核数 × 2 + 1`，配合 systemd 把服务注册成开机自启、崩溃自动拉起的系统服务。

**Nginx** 站在最前面，干三件事：终止 HTTPS（证书配在这层）、把请求转发给应用服务器、直接托管静态文件（CSS/JS 不必劳驾 Python）：

```nginx
server {
    listen 80;
    server_name example.com;

    location /static/ {
        alias /srv/myapp/static/;
    }

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**配置与密钥走环境变量**，代码里只读取、不写死：

```python
import os

SECRET = os.environ["JWT_SECRET"]          # 缺失直接报错，好过带错误密钥上线
DB_URL = os.environ.get("DATABASE_URL", "sqlite:///dev.db")
```

本地开发配合 `python-dotenv` 从 `.env` 文件加载，`.env` 务必写进 `.gitignore`——历史上无数密钥泄露事故都源于把它提交进了仓库。

## 用 Docker 把环境装进箱子

"在我机器上是好的"是部署头号难题，Docker 的解法是把 Python 版本、依赖、代码打成镜像，到哪都跑得一样：

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
docker build -t myapi .
docker run -d -p 8000:8000 --env-file .env myapi
```

再往上是容器编排（Kubernetes）、CI/CD 自动构建部署、灰度发布，那是另一个世界了——但对个人项目和中小服务，"Docker + 一台 VPS + Nginx + systemd"已经是非常成熟和省心的终态。

## 系列小结

六篇走完一条完整的路：**HTTP 协议与手写 WSGI**（理解本质）→ **Flask**（最小可用）→ **FastAPI**（类型驱动）→ **Django**（全家桶）→ **数据库、鉴权与部署**（生产化）→ **[工具链](/post/python-backend-06-toolchain)**（uv、ruff、pytest，把质量管起来）。接下来值得深入的方向：缓存（Redis）、任务队列（Celery）、以及把其中某一篇里的待办 API 真正做成一个完整项目。

## 动手练习

1. 把[第二篇](/post/python-backend-02-flask)的内存待办 API 改造成 SQLAlchemy + SQLite 存储，重启进程后数据还在；
2. 实现注册/登录两个接口：注册时 bcrypt 哈希入库，登录成功签发 1 小时有效的 JWT，再写一个受 `current_user` 依赖保护的接口验证它；
3. 写一个 Dockerfile 把你的 API 打包，`docker run` 起来后用 curl 走通完整登录流程。
