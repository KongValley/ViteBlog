---
title: 2026 年 AI 编程 Coding Plan 价格对比：8 款个人套餐怎么选
date: 2026-09-17
tags:
  - AI 编程
  - Coding Plan
  - 工具对比
categories:
  - AI 编程
excerpt: 对照官方价格比较百炼、MiniMax、Kimi、GLM、GitHub Copilot、Cursor、Claude Code 和 Codex，并按预算与工作流给出选择建议。
---

AI 编程工具的月费看起来都像一个数字，实际买到的东西却不一样：有的是编辑器补全，有的是能改动整个仓库的 Agent，有的是一池可在多种工具里使用的模型额度。只看“每月多少钱”，很容易买完才发现额度不够，或发现自己需要的功能在另一个产品里。

**价格核对日期：2026 年 9 月 17 日。**下面只比较个人可购买的公开套餐，按月付费价格列示；优惠价会单独标明。人民币和美元不强行换算，因为汇率、税费、地区和支付渠道都会改变实际账单。套餐可能随时调整，购买前请再次打开文中的官方链接确认。

## 国内方案：人民币月费

| 产品 | 入门价格 | 适合谁，以及最需要注意的限制 |
| --- | --- | --- |
| [阿里云百炼 Token Plan](https://help.aliyun.com/zh/model-studio/token-plan-personal-overview) | Lite **¥39/月限时**，原价 ¥60；Standard ¥139/月限时，原价 ¥180 | **不推荐作为多模型编程首选。**个人版可用的文本与推理模型主要集中在千问、DeepSeek、GLM，想在同一套餐里切换 Claude、GPT 等模型时选择有限。Lite 每 7 天 2,500 Credits，额度到顶会暂停。 |
| [MiniMax Token Plan](https://platform.minimax.cn/subscribe/token-plan) | Plus **¥49/月**；Max ¥119/月 | 想把 MiniMax 模型接入编程工具，或使用 MiniMax Code。文本、图像、语音共用额度；套餐受 5 小时窗口和周窗口约束，高峰期可能动态限流。 |
| [Kimi 会员](https://www.kimi.com/help/membership/membership-pricing) | Andante **¥49/月**；Moderato ¥99/月 | 同时用 Kimi 的编程、文档、研究等功能。所有会员功能共用额度池；Kimi Code 另有 5 小时和每周限额，其他功能消耗也会影响可用余额。 |
| [GLM Coding Plan](https://zcode.z.ai/cn/docs/configuration) | Lite **¥118/月**；Pro ¥538/月；Max ¥1,078/月 | 已习惯 ZCode、GLM 或希望在支持的工具里使用 GLM。新版按积分计算，并有 5 小时与每周额度；Pro、Max 分别是 Lite 的 6 倍、14 倍用量。 |

上表的百炼 **¥39** 是限时价，不能当成长期固定成本。MiniMax 官网同时展示年付总价与月费，表中取月付价。GLM 页面也可能显示按年付费折算的低价，表中用月付标价。各家 Credits、Token 和“请求数”的定义不同，**不能把数字直接相除来算谁更划算**。

百炼个人版目前列出的文本与推理模型来自千问、DeepSeek 和 GLM；它能接入 Cursor、Claude Code 等**工具**，并不表示套餐包含这些工具原厂的模型订阅权益。如果只想用这几家的模型，仍可按具体需求评估；若希望广泛切换不同厂商的编程模型，我不推荐把它作为首选。可用型号以后可能变化，购买前查看[百炼官方支持列表](https://help.aliyun.com/zh/model-studio/token-plan-personal-overview)。

## 海外方案：美元月费

| 产品 | 入门价格 | 适合谁，以及最需要注意的限制 |
| --- | --- | --- |
| [GitHub Copilot](https://github.com/features/copilot/plans) | Free **$0**；Pro **$10/月**；Pro+ $39/月 | 主要在已有 IDE 里要补全、聊天与 GitHub 工作流。免费版有每月 2,000 次补全；Pro 的补全不限次数，但聊天和 Agent 使用 AI Credits，复杂任务消耗更快。 |
| [Cursor](https://cursor.com/pricing) | Hobby **$0**；Pro **$20/月**；Pro+ $60/月 | 愿意把主力编辑器换成 Cursor，常用内置 Agent 和补全。Pro+ 提供 3 倍 Pro 的 Agent 限额；套餐用完后，按需使用可能产生额外费用。 |
| [Claude Pro / Claude Code](https://claude.com/pricing) | Pro **$20/月**；Max **$100/月起** | 习惯在终端里让 Claude Code 读项目、改代码。Claude 聊天和 Claude Code 共用套餐额度，存在 5 小时窗口及每周限制；Pro 的 $17/月是年付折算价。 |
| [ChatGPT Plus / Codex](https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus) | Plus **$20/月**；Pro **$100/月起** | 同时需要通用 ChatGPT 与 Codex 编程 Agent。Plus 包含 Codex 用量，但限额随任务大小、模型等因素变化；使用自己的 API Key 则按 API 价格另计。 |

截至核对日，[OpenAI 官方说明](https://help.openai.com/en/articles/9793128-what-is-chatgpt-pro)：**Pro $200 档暂时暂停新订阅和升级**，现有订阅可继续；$100 档仍可购买。因此这里把可新购的 Pro 档写为 $100 起，而不把 $200 当作普通升级选项。Claude Max、Cursor Ultra 等高档位也要结合真实用量考虑，单看“倍数”无法推断每月能完成多少任务。

## 选套餐前，先看这四件事

### 1. 你买的是工具，还是模型额度？

Copilot、Cursor、Codex 和 Claude Code 都有各自的工作界面。百炼、MiniMax、GLM 这类套餐更多是在指定模型与支持的工具之间提供订阅额度。**能在 Claude Code 里配置某家的模型服务，不等于获得 Claude 官网的 Pro 会员权益。**先确认自己想用的是哪种编辑体验，以及套餐是否支持该工具和模型。

### 2. 限额按什么周期重置？

“每月额度”之外，还可能有 5 小时、7 天或每周窗口。百炼 Lite 的 2,500 Credits 是每 7 天额度；MiniMax 和 GLM 还有更短的用量窗口；Claude 的聊天与编程共用额度。偶尔突击写一个大功能的人，尤其要看短窗口是否会在任务中途触顶。

### 3. 超额后会怎样？

有的方案暂停等待重置，有的允许购买用量包或按需付费。Cursor 官方说明按需用量可能在套餐额度耗尽后继续计费；Copilot 也可通过预算允许额外用量。开通前看一眼用量页面和预算开关，避免在不知情的情况下产生额外账单。

### 4. 对同一任务亲自试用

拿自己的真实仓库，给每个工具同一项任务：例如跨三个文件修 Bug、补测试，再让它解释改动。记录完成时间、需要你返工的次数、额度消耗和操作是否顺手。这样得到的结论，比把各家的宣传数字排成名次更适合你的工作流。

## 我的选择建议

- **预算有限，先免费试用：**从 Copilot Free 开始验证补全需求；国内方案可先看 GLM/ZCode 的新用户体验权益，再决定是否订阅。试用额度和有效期请以各自页面当时显示为准。
- **主要写代码补全、保留现有 IDE：**先看 Copilot Pro 的 $10/月。它的价格入口低，付费版补全不限次数；如果主要使用 Agent，另看 AI Credits 消耗。
- **想用人民币买 AI 编程额度：**先试 MiniMax Plus ¥49，再用自己的常见任务检查模型表现和额度消耗。若还经常用 Kimi 写文档和做研究，可一起评估 Kimi Andante ¥49 的共享额度。**百炼 Token Plan 暂不推荐作为多模型首选**：虽然 Lite 限时价 ¥39 较低，但可用的编程模型主要集中在千问、DeepSeek、GLM，选择范围不符合需要频繁切换其他厂商模型的工作流。
- **已经习惯 ZCode + GLM：**GLM Lite ¥118/月能直接接上既有工作流；只有确实常碰到额度或速度瓶颈，再看 Pro。套餐价格比其他国产入门档高，买之前应先跑自己的项目。
- **想要完整的代码 Agent 工作流：**已有 ChatGPT 需求就先试 Plus + Codex；偏好 Claude Code 的终端操作就先试 Claude Pro；愿意换编辑器并重视 Cursor 的交互，再看 Cursor Pro。三者入门都是 $20/月，但体验和限额结构不同。

我的购买顺序是：**先用免费版或一个月入门档，查真实用量，再升级。**不要同时订阅几家高档位，只因担心某一天会碰到限额；先找出最常用、最省返工的那一个，成本才容易控制。
