---
title: Python 后端（四）：Django 全家桶入门
date: 2026-09-18
tags:
  - Python
  - 后端
  - Django
categories:
  - Python
excerpt: Django 把 ORM、管理后台、用户认证都装进了一个框架。从创建项目到数据迁移再到 Admin 后台，体验"开箱即用"的开发方式。这是 Python 后端系列的第四篇。
---

如果说 Flask 和 FastAPI 是"给你积木自己搭"，Django 就是"精装修拎包入住"：ORM、管理后台、用户系统、表单、缓存、国际化全部内置，彼此无缝协作。它的哲学叫 **batteries included**——装上电池就能用。代价是你要按它的方式组织代码，学习曲线比前两者陡。

先安装并创建项目：

```bash
pip install django
django-admin startproject mysite
cd mysite
python manage.py runserver
```

访问 `http://127.0.0.1:8000`，一个能跑的网站已经出现了。`mysite/` 里的关键文件：`settings.py` 是全站配置，`urls.py` 是根路由表，`manage.py` 是项目管理入口。

## 应用（app）：Django 的功能单元

Django 项目由若干**应用**拼成，每个应用负责一块独立功能——博客是一个 app，用户是另一个：

```bash
python manage.py startapp blog
```

生成 `blog/` 目录，包含模型 `models.py`、视图 `views.py` 等。新建的 app 必须在 `mysite/settings.py` 里注册：

```python
INSTALLED_APPS = [
    # ...Django 自带应用
    "blog",
]
```

## MTV：Django 版的 MVC

Django 讲 **MTV** 架构，和经典 MVC 的对应关系是：

- **Model（模型）**：描述数据结构和数据库操作，对应 MVC 的 M；
- **Template（模板）**：HTML 页面模板，对应 MVC 的 V；
- **View（视图）**：接收请求、调用模型、选择模板返回，对应 MVC 的 C。

初学者最容易绕晕的就是"视图其实是控制器"。记住请求的流向就不会错：**URL 分发 → 视图 → 模型 → 视图组装 → 模板渲染 → 响应**。

## 用 ORM 描述数据

模型类就是数据库表。在 `blog/models.py` 里：

```python
from django.db import models


class Post(models.Model):
    title = models.CharField(max_length=100)
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.title
```

定义完两条命令让数据库跟上：

```bash
python manage.py makemigrations   # 依据模型变化生成迁移脚本
python manage.py migrate          # 执行迁移，真正建表/改表
```

这套**迁移机制**是 Django ORM 最实用的部分：每次改模型（加字段、改类型），重复这两条命令，数据库结构就平滑演进，历史变更全部留痕、可回滚。项目里默认用 SQLite，开发零配置；上线改 `settings.py` 里的 `DATABASES` 即可切到 PostgreSQL 或 MySQL，代码一行不用动。

## 查询：objects 管理器

```python
from blog.models import Post

Post.objects.create(title="你好 Django", body="第一篇")

Post.objects.all()                                   # 全部
Post.objects.get(pk=1)                               # 主键取一条，不存在抛 DoesNotExist
Post.objects.filter(title__contains="Django")        # 模糊过滤
Post.objects.exclude(body="").order_by("-created_at")[:10]  # 排序 + 截取前 10 条
Post.objects.filter(title__contains="Django").count()
```

双下划线语法是 Django 的查询 DSL：`field__contains`、`field__gte`（大于等于）、`field__in`、跨表 `author__username`。这些查询最终都会参数化执行，**天然免疫 SQL 注入**——只要你不自己拼接原生 SQL 字符串。

## 五分钟拥有一个管理后台

这是 Django 的招牌能力。在 `blog/admin.py` 里注册模型：

```python
from django.contrib import admin
from .models import Post


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "created_at")
    search_fields = ("title",)
```

创建管理员账号后访问 `/admin/`：

```bash
python manage.py createsuperuser
```

一个带登录、增删改查、搜索、分页的内容管理后台就绪了，不用写一行前端。给运营或内容团队用，这一项就能省掉数周的开发量。

## 视图与路由：把数据吐出去

最简单的函数视图，返回 JSON：

```python
# blog/views.py
from django.http import JsonResponse
from .models import Post


def post_list(request):
    data = list(Post.objects.values("id", "title", "created_at")[:20])
    return JsonResponse({"posts": data})
```

路由写在 app 自己的 `blog/urls.py`，再挂到根路由：

```python
# blog/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("posts/", views.post_list),
]

# mysite/urls.py
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("blog/", include("blog.urls")),
]
```

访问 `/blog/posts/` 得到 JSON。写页面则用模板视图：`render(request, "blog/list.html", {"posts": data})` 会去各 app 的 `templates/` 目录找模板渲染，模板语法支持 `{% raw %}{{ posts }}{% endraw %}`、`{% raw %}{% for %}{% endraw %}` 和模板继承。

## 用户系统是送的吗？

基本是。`django.contrib.auth` 内置了用户模型、密码哈希（PBKDF2）、登录登出视图、权限和用户组。`settings.py` 里 `LOGIN_URL` 一配，视图加个装饰器就能控制访问：

```python
from django.contrib.auth.decorators import login_required


@login_required
def dashboard(request):
    ...
```

要构建规范的 REST API（序列化、视图集、路由自动生成），社区标准方案是 **Django REST framework（DRF）**，在 `pip install djangorestframework` 之后把模型包装成 Serializer 即可，此处不展开。

## 什么时候选 Django

- 要做**内容型产品**：博客、CMS、企业内部系统——Admin 后台是决定性优势；
- 需要**完整的用户体系**：注册、登录、权限、密码重置，开箱即用；
- 团队希望**一套约定走天下**：目录结构、配置、迁移全有标准答案，新成员上手快。

反过来，如果只是为前端提供几个轻量 API、追求极致性能或异步并发，Flask 或 FastAPI 更合适。另一点提醒：Django 的核心（ORM、Admin）是同步的，虽然有 ASGI 支持和异步 ORM 的探索，异步生态仍不如 FastAPI 成熟。

## 动手练习

1. 给 `Post` 增加一个 `author` 字段（`models.CharField(max_length=50)`），走一遍 `makemigrations` + `migrate`，再到 Admin 里确认新字段可编辑；
2. 写一个 `post_detail` 视图和路由 `/blog/posts/<int:pk>/`，返回单篇文章 JSON，文章不存在时返回 404（提示：`get_object_or_404`）；
3. 用 shell（`python manage.py shell`）批量创建 20 篇文章，然后用双下划线查询按 `created_at` 倒序取第 2 页（每页 5 条）。
