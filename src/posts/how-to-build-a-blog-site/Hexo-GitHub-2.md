---
title: 💖Hexo+GitHub配置保姆版（二）
date: 2020-01-06 17:53:45
tags:
  - Hexo
  - GitHub Page
categories:
  - Build Blog
cover: https://blog-chara-img.oss-cn-shanghai.aliyuncs.com/blog-img/Blog-Cover-Image/wallhaven-28d8gm.jpg
---
Hexo官网里面有都文档说明，首先打开 Git Bash，先定位到你要放博客的文件夹，建议不要那种需要管理员权限才能新建文件的文件夹，我自己是在 `D:\My-blog` 里

## Install Hexo

[Hexo官网](https://hexo.io/)里面有都文档说明，首先打开 Git Bash ，先定位到你要放博客的文件夹，建议**不要**那种需要管理员权限才能新建文件的文件夹，我自己是在`D:\My-blog`里

```bash
cd 文件夹
```

![](https://blog-chara-img.oss-cn-shanghai.aliyuncs.com/blog-img/hexo%E9%85%8D%E7%BD%AE/2-1.png?x-oss-process=style/2333)

这样就定为到了 `D:\My-blog`，然后开始安装 Hexo

```bash
npm install -g hexo-cli
```

安装好 Hexo，输入：

```bash
hexo
```

如果出现以下这图就说明你的 Hexo 安装成功

![](https://blog-chara-img.oss-cn-shanghai.aliyuncs.com/blog-img/hexo%E9%85%8D%E7%BD%AE/2-2.png?x-oss-process=style/2333)

<br>

## Init your blog folder

```bash
# 建立一个博客文件夹，并初始化博客，<folder>为文件夹的名称，可以随便起名字，不要傻fufu的把<>也打上去
hexo init <folder>
# 进入博客文件夹，<folder>为文件夹的名称
cd <folder>
# node.js的命令，根据博客既定的dependencies配置安装所有的依赖包
npm install
```

安装完成后，你的文件夹里就会变成这样

![](https://blog-chara-img.oss-cn-shanghai.aliyuncs.com/blog-img/hexo%E9%85%8D%E7%BD%AE/2-3.png?x-oss-process=style/2333)

这里的 `_config.yml` 是你的站点配置文件，你可以打开它修改你的站点信息（每个：后面都有一个空格）

**repo中填入你的仓库地址**

```yml
url: http://yoursite.com # 把这个改成你的github地址（例如：http://kongvalley.github.io）

deploy:
    type: git
    repo: git@github.com:KongValley/KongValley.github.io.git
    branch: master
```

新建文章

```bash
# 新建文章
hexo new "文章标题"
```

新建的 markdown 文件会在 `source/_posts` 中

```bash
# 进行本地浏览博客
# 在Hexo 3.0 后server被单独出来了，需要安装server
npm install hexo-server --save
hexo s
```

在浏览器中输入 `http://localhost:4000/ ` ，你就能看到自己的博客了

## Publish blog

```bash
# 将你的博客发布到你的gtihub主页上
# 在Hexo 3.0版本后deploy git被分开的，需要安装deploy git
npm install hexo-deployer-git --save
hexo g
hexo deploy
```

你就可以登录你的 `http://xxxxxxx.github.io` 看看自己的博客了
