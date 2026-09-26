---
title: 🤖 oh-my-pi 上手（三）：AGENTS.md、技能与 MCP
date: 2026-09-26 20:00:00
cover: /ViteBlog/images/covers/omp-03-context-skills-mcp.jpg
tags:
  - oh-my-pi
  - AI 编程
  - MCP
categories:
  - AI 编程
excerpt: 项目规矩写进 AGENTS.md 自动加载，可复用的工作流做成技能，一份 mcp.json 接进外部工具。这篇讲 omp 的三个扩展面：上下文文件、技能与 MCP 服务器。
---

前两篇解决了[安装](/post/omp-01-getting-started)和[配置](/post/omp-02-config-models)，这篇讲怎么把"项目知识"和"外部能力"喂给代理。三样东西：上下文文件、技能、MCP。

## AGENTS.md：项目说明书

omp 启动时自动发现并注入指令文件，不用每次喊"先读一下 AGENTS.md"：

- 用户级：`~/.omp/agent/AGENTS.md`，所有会话都带；
- 项目级：仓库里的 `.omp/AGENTS.md`（推荐）或根目录的 `AGENTS.md`；
- 别的工具写的也认：`.claude/CLAUDE.md`、`.github/copilot-instructions.md`、`.gemini/GEMINI.md`……不用迁移。

两条规则要知道：

1. **就近原则**：从当前目录往仓库根找，命中第一个非空的 `.omp/` 就停。monorepo 里 `packages/api/.omp/AGENTS.md` 生效时，根上的那份不会再注入——根目录放通用背景，包目录放专属约定。
2. **同层遮蔽**：同一目录深度只留优先级最高的一份，`.omp/AGENTS.md` 优先级最高。

文件里可以引用其他文档，`@路径` 会原地展开成内容：

```markdown
# 项目笔记

改存储代码前先读 @docs/architecture.md。
```

相对路径按引用者所在目录解析，最多递归五层，循环自动跳过，代码块里的 `@` 不会被误展开。

**硬规矩单独立个 RULES.md**：`.omp/RULES.md`（或用户级 `~/.omp/agent/RULES.md`）里的每一条都会挂在每次请求上，长对话冲淡不了。放"不许未经确认就 push"这种铁律；长篇背景归 AGENTS.md，只花一次上下文的钱。

## 技能：把工作流做成文件

AGENTS.md 是"每次都在"，技能是"按需取用"。一个技能就是一个目录：

```text
.omp/skills/
└── review-code/
    ├── SKILL.md        # 必需：frontmatter + 正文
    ├── references/
    └── scripts/
```

`SKILL.md` 的 frontmatter 写 `name` 和 `description`——description 写清楚什么场景用，代理靠它决定何时取用：

```markdown
---
name: review-code
description: 按正确性、安全、可维护性三个维度审查代码改动。
---

# 代码审查

1. 先列正确性问题……
```

用起来两条路：会话里 `/skill:review-code` 手动触发；或者代理判断任务匹配，自己通过 `skill://review-code` 读进来。技能目录里的脚本、模板用 `skill://review-code/scripts/xxx.sh` 这样的路径访问。

技能目录一层一个，`skills/组/技能/SKILL.md` 这种嵌套默认发现不了。`.claude/skills`、Codex、`.github/skills` 里的技能也会被读，同名时优先级高的赢。

## MCP：一份 mcp.json 接外部世界

配置文件：项目 `.omp/mcp.json`，用户级 `~/.omp/agent/mcp.json`。stdio 本地进程和 http 远程服务都支持：

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/abs/path"]
    },
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": { "Authorization": "Bearer ${GITHUB_TOKEN}" }
    }
  }
}
```

`${VAR}` 会被环境变量替换，密钥不落库。会话里管理：

```text
/mcp list       # 看连接状态
/mcp add        # 交互式添加
/mcp reload     # 手改完配置后重连
/mcp test github
```

MCP 工具以 `mcp__服务器名__工具名` 的形式出现。`.claude/`、`.cursor/`、`.vscode/mcp.json` 这些别家配置也会被自动翻译读取——已有的 MCP 配置不用动。

下一篇：[子代理并行与会话管理](/post/omp-04-subagents-sessions)。
