---
title: 🚀PowerShell自用
date: 2020-01-17 15:34:36
updated: 2026-09-21
tags:
  - PowerShell
categories:
  - Tool
---
## Install PowerShell Preview

Windows 用户我个人推荐使用 choco 安装 [PowerShell Preview](https://chocolatey.org/packages/powershell-preview)，方便快捷，需要使用管理员权限执行安装命令。

## 安装 oh-my-posh
给 PowerShell 权限去执行任意脚本
```powershell
Set-ExecutionPolicy Bypass
```
安装 `posh-git`
```powershell
Install-Module posh-git -Scope CurrentUser
```
安装 `oh-my-posh`
```powershell
Install-Module oh-my-posh -Scope CurrentUser
```

## 写入到配置文件
先获取文件路径
![PowerShell 里获取配置文件路径的命令与输出](/images/tool/PowerShell自用/1.png)

这个文件不存在的话就新建一个，写入以下内容：
```powershell
Import-Module posh-git
Import-Module oh-my-posh
Set-Theme Sorin
```