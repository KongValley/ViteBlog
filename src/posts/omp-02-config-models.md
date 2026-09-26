---
title: 🤖 oh-my-pi 上手（二）：配置分层、模型角色与审批策略
date: 2026-09-26 20:30:00
cover: /ViteBlog/images/covers/omp-02-config-models.jpg
tags:
  - oh-my-pi
  - AI 编程
  - 配置
categories:
  - AI 编程
excerpt: 全局配置、项目配置、一次性 overlay 与运行时参数谁说了算？模型角色怎么分工？审批模式怎么从"每步都问"调到"只在写文件时问"？这篇讲清 omp 的配置体系。
---

上一篇[装好了 omp](/post/omp-01-getting-started)，这篇把配置体系说透。omp 的所有设置都是 YAML，一共五层，谁在上面听谁的。

## 五层优先级

| 层 | 位置 | 说明 |
| --- | --- | --- |
| 内置默认 | — | 兜底 |
| 全局 | `~/.omp/agent/config.yml` | `/settings`、`omp config set` 都写这里 |
| 项目 | `<仓库>/.omp/config.yml` | 某个仓库要不同策略时手写 |
| overlay | `--config ./xxx.yml` | 一次性，不落盘 |
| 运行时 | `--model`、`--approval-mode` 等参数 | 只影响本次进程 |

合并规则两条：对象深层合并；**标量和数组整体替换**。后者是最容易踩的坑——项目里写 `disabledProviders: [groq]`，不会叠加全局那份列表，而是整个换掉。想在项目里"追加"，就把全局的条目抄过来。

命令行看当前生效值：

```bash
omp config list                # 全量，含来源
omp config get theme.dark      # 单个
omp config set compaction.enabled false
omp config reset steeringMode  # 删掉某键，回到默认
```

## 模型角色：让便宜模型干杂活

omp 可以给不同"岗位"配不同模型：

```yaml
# <仓库>/.omp/config.yml
modelRoles:
  default: anthropic/claude-sonnet-4-5   # 主力
  smol: openai/gpt-4.1-mini              # 小任务：起标题、摘要
  slow: anthropic/claude-opus-4-5:high   # 难任务，拉满思考
  plan: anthropic/claude-opus-4-5        # 规划
```

临时覆盖用参数：`--model`、`--smol`、`--slow`、`--plan`；环境变量 `PI_SMOL_MODEL` 这套也认；会话里 `/model` 随时切。

## 自定义提供商：models.yml

公司网关、第三方中转，只要兼容 OpenAI 接口就能接。写在 `~/.omp/agent/models.yml`：

```yaml
providers:
  my-gateway:
    baseUrl: https://gateway.example.com/v1
    api: openai-completions
    apiKey: MY_GATEWAY_API_KEY   # 优先当环境变量名读，读不到才当字面量
    models:
      - id: fast-chat
        name: Fast Chat
        contextWindow: 128000
        maxTokens: 8192
```

`apiKey` 还支持 `!命令` 形式从密码管理器取（如 `!op read ...`）。配完 `omp models my-gateway` 验证发现，然后就能用 `my-gateway/fast-chat` 选它。

不想看到的提供商直接关掉：

```yaml
disabledProviders:
  - anthropic
  - openai
```

## 审批：从"步步惊心"到"放心放手"

`tools.approvalMode` 三档：

- `always-ask`：每步都问，新手期用；
- `write`：写文件要确认，读和搜放行——日常推荐的档位；
- `yolo`：全放行，只在自己确信的环境里用。

再细一层是按工具配：

```yaml
tools:
  approvalMode: write
  approval:
    bash: prompt    # 命令逐条问
    edit: allow     # 编辑放行
    write: prompt   # 整文件写入要确认
```

bash 还能按命令模式放行，第一条命中的规则生效：

```yaml
bash:
  patterns:
    - match: "git status"
      approval: allow
    - match: "rm -rf *"
      approval: deny
```

对应的一次性参数是 `--approval-mode write` 和 `--yolo`。我的取舍：个人项目用 `write` 再给只读命令开 allow；碰生产的仓库退回 `always-ask`。

下一篇：[AGENTS.md、技能与 MCP](/post/omp-03-context-skills-mcp)。
