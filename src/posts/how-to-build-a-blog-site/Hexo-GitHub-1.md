---
title: 💛Hexo+GitHub配置保姆版（一）
date: 2020-01-06 16:39:53
updated: 2026-09-21
tags:
  - Hexo
  - GitHub Page
categories:
  - Build Blog
cover: /ViteBlog/images/how-to-build-a-blog-site/Hexo-GitHub-1/wallhaven-g7qjr3.jpg
---
注册Github帐号
点击 [这里](https://github.com/)，直接 sign up 注册，填完 step1 里的信息之后，直接下一步下一步，等下你注册时用的邮箱会收到一封来自 Github 的验证邮件，验证完成后，点击导航条右边的 +

![GitHub 导航栏右上角的 + 按钮(新建仓库入口)](/images/how-to-build-a-blog-site/Hexo-GitHub-1/1-1.png)

点击红圈的这个按钮后，我用的是我自己的号做的示范，然后在 Repository name 这里填 `你的用户名.github.io` ，我自己的就是 `KongValley.github.io`，然后点 Create repository ，你就建好了一个 GitHub 仓库

![仓库名填 你的用户名.github.io,然后点 Create repository](/images/how-to-build-a-blog-site/Hexo-GitHub-1/1-2.png)

<br>

## Install Git

点击[这里](https://git-scm.com/downloads)找到适合自己电脑系统的安装包，安装过程也挺简单的，一直点 next 就好了

<br>

## Install Node.js

点击[这里](https://nodejs.org/en/download/)找到适合自己电脑系统的安装包，这个和上面安装Git一样简单，一直 next

<br>

## Deploy SSH

安装好了 Git 后，你在你程序里应该能找到这个 Git Bash 程序

![开始菜单里的 Git Bash 程序](/images/how-to-build-a-blog-site/Hexo-GitHub-1/1-3.png)

点击它，跳出一个命令窗口

![打开后的 Git Bash 命令行窗口](/images/how-to-build-a-blog-site/Hexo-GitHub-1/1-4.png)

直接输入：

```bash
ssh-keygen -t rsa -C "Github的注册邮箱地址"
```

然后一路回车，如果你是Windows用户的话，你会在你的 C:\Users\admin.ssh 里找到 id_rsa 和 id_rsa.pub 两个文件，用记事本打开 id_rsa.pub 文件，`Ctrl+A`全选复制里面的内容，然后点击[这里](https://github.com/settings/keys)，给你的仓库添加 SSH keys

![在 GitHub 设置里添加 SSH key](/images/how-to-build-a-blog-site/Hexo-GitHub-1/1-5.png)