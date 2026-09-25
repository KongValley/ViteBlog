---
title: 🤖 oh-my-pi 上手（一）：装好 omp，把终端变成编程代理
date: 2026-09-26 21:00:00
tags:
  - oh-my-pi
  - AI 编程
  - 终端
categories:
  - AI 编程
excerpt: oh-my-pi（命令叫 omp）是一个原生跑在终端里的编程代理：读写文件、执行命令、接 LSP 和调试器。这篇记录安装、配 Key 和第一次会话的完整过程。
---

之前写过 [ZCode + GLM 的上手记录](/post/zcode-glm-getting-started)，最近又把 [oh-my-pi](https://github.com/can1357/oh-my-pi) 纳入了日常。它的命令行叫 `omp`，这篇先解决"装上、配好、跑起来"三件事。

## oh-my-pi 是什么

一个跑在终端里的编程代理，fork 自 Mario Zechner 的 [Pi](https://github.com/badlogic/pi-mono)，由 Stencil Labs 维护。官方一句话定位："A coding agent with the IDE wired in"——把 IDE 的能力接进代理：

- 读代码走的是总结式的 read，改代码有内容哈希锚点的 edit 和 AST 级的 ast_edit，少很多"字符串没找到"的重试；
- LSP 接进每一次写入：让代理改名，走的是 workspace/willRenameFiles，barrel 文件和别名导入一起更新；
- 能驱动真正的调试器（DAP）：断点、单步、看栈，而不是到处插 print；
- 原生实现：ripgrep、glob、bash 连同 46 个 coreutils 都编进了进程，Windows 上原生跑，不需要 WSL。

规模数据：60+ 模型提供商、31 个内置工具、约 8 万行 Rust 核心。

## 安装

五条路选一条：

```bash
# macOS / Linux 官方安装脚本
curl -fsSL https://omp.sh/install | sh

# Homebrew
brew install can1357/tap/omp

# Bun（要求 Bun ≥ 1.3.14）
bun install -g @oh-my-pi/pi-coding-agent

# Windows PowerShell
irm https://omp.sh/install.ps1 | iex

# Nix
nix run github:can1357/oh-my-pi            # 免安装直接跑
nix profile install github:can1357/oh-my-pi
```

Alpine/musl 的预编译二进制动态链接 `libstdc++`/`libgcc`，先 `apk add libstdc++ libgcc` 再装。

装完验证：

```bash
omp --version
omp --help
```

顺手把补全挂上（从命令元数据生成，不会和实际 CLI 漂移）：

```bash
eval "$(omp completions zsh)"   # bash 同理；fish 写入 completions 目录
```

## 配模型：三条路

omp 是"代理壳 + 任意模型"的组合。模型按 `provider/model` 选择，比如 `anthropic/claude-sonnet-4-5`。凭据三条路：

1. **登录**：会话里 `/login`（可指定 `/login anthropic` 直达），或终端 `omp login`。登录按提供商隔离——登了 Anthropic 不代表 OpenAI 也好了。
2. **环境变量**：各家一个，`ANTHROPIC_API_KEY`、`OPENAI_API_KEY`、`GEMINI_API_KEY`、`OPENROUTER_API_KEY`……
3. **`.env` 文件**：按 `进程环境 → <项目>/.env → ~/.omp/agent/.env → ~/.omp/.env → ~/.env` 取第一个出现的值；已经 export 过的变量不会被文件覆盖。

临时换模型用启动参数，会话里用 `/model` 随时切：

```bash
omp --model anthropic/claude-sonnet-4-5
```

## 第一次会话

```bash
cd 你的项目
omp
```

然后直接用中文提需求："给文章卡片加一个悬停效果"。它会先自己读代码搞清结构，列出要动的文件，经你确认后动手，最后跑构建/测试验证。

几个立刻用得上的形态：

```bash
omp                        # 交互会话
omp -p "总结这个仓库的目录结构"   # 无头模式，跑完退出，适合脚本
omp --continue             # 接着上次的会话
```

## 这一系列写什么

- （一）安装与第一次会话，就是这篇；
- （二）配置分层、模型角色与审批策略；
- （三）AGENTS.md、技能与 MCP；
- （四）子代理并行与会话管理。

下一篇：[配置分层、模型角色与审批策略](/post/omp-02-config-models)。
