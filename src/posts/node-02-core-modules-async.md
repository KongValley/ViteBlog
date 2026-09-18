---
title: Node.js 入门（二）：核心模块与异步编程
date: 2026-09-18
tags:
  - Node.js
categories:
  - Node.js
excerpt: fs、path、http 三大件,事件循环与非阻塞 I/O 的心智模型,再用流处理大文件——Node 内置能力一次讲透。这是 Node.js 从入门到精通系列的第二篇。
---

不装任何第三方包,Node 的内置模块已经够你写出能用的后端。这一篇把最常用的几件过一遍,重点是建立**非阻塞 I/O 的心智模型**——它是理解 Node 一切行为的基础。

## 全局对象与 process

Node 没有浏览器里的 `window`,取而代之的是 `process`:

```js
console.log(process.argv);        // 命令行参数
console.log(process.env.HOME);    // 环境变量
console.log(process.cwd());       // 工作目录
console.log(process.platform);    // win32 / linux / darwin
```

环境变量是配置注入的标准通道,数据库地址、密钥都从这里读——这个习惯在[部署篇](/post/node-05-db-auth-deploy)会再次出现。

## fs 与 path:读写文件

`node:fs/promises` 提供全 Promise 化的文件 API,配合 `node:path` 拼路径(跨平台分隔符问题交给它):

```js
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

await mkdir("data", { recursive: true });

const config = JSON.parse(await readFile(join("data", "config.json"), "utf8"));
await writeFile("out.txt", `生成于 ${new Date().toISOString()}\n`);
```

注意别用字符串相加拼路径:`"data" + "/" + name` 在 Windows 上会埋雷,`join("data", name)` 永远正确。

## http:不框架起一个服务

```js
import { createServer } from "node:http";

const server = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  res.writeHead(404);
  res.end("Not Found");
});

server.listen(3000, () => console.log("http://localhost:3000"));
```

十几行,一个真的 HTTP 服务。但 URL 一多,`if/else` 判断路径、手工解析 body、区分 GET/POST 会迅速失控——这正是[下一篇框架](/post/node-03-web-frameworks)要解决的。

## 事件循环:非阻塞的心智模型

Node 的 JS 代码跑在**单线程**上,配套一个事件循环:遇到 I/O(读文件、查数据库、发请求)就登记回调,继续执行后面的代码;I/O 完成后,回调排进队列等待执行。所以:

```js
import { readFile } from "node:fs/promises";

console.log("1");
const task = readFile("big.log", "utf8"); // 发起读取,不等它
console.log("2");                          // 先打印
console.log((await task).length);          // await 处才真正等待
```

由此推出两条铁律:**别在请求处理里用同步阻塞 API**(`readFileSync` 会让整个服务卡住,所有用户一起等);**CPU 密集计算会饿死事件循环**(大循环转 10 秒,服务就 10 秒不响应任何人,这种活用 worker 线程或干脆换语言)。异步演进史(回调 → Promise → async/await)在 [JS 系列第四篇](/post/js-04-async-event-loop)已经讲过,规则完全通用。

并发等待多个 I/O 用 `Promise.all`:

```js
const [html, meta] = await Promise.all([
  readFile("index.html", "utf8"),
  readFile("meta.json", "utf8"),
]);
```

## Buffer 与流:大文件不进内存

读图片、压缩包这类二进制,拿到的是 `Buffer`(字节序列)。而处理 GB 级日志的正确姿势是**流**:数据分块流动,内存占用恒定:

```js
import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";
import { pipeline } from "node:stream/promises";

// 解压 2GB 的 access.log.gz,内存只用几 MB
await pipeline(
  createReadStream("access.log.gz"),
  createGunzip(),
  process.stdout,
);
```

`pipeline` 串起"读文件 → 解压 → 输出"三段,任何一段出错都会正确清理资源。和 [Python 生成器管道](/post/python-advanced-01-generators)是同一个思想:逐块处理,而不是整块吞下。

## events:发布订阅

内置 `EventEmitter` 是"发生了某件事,通知所有关心它的人":

```js
import { EventEmitter } from "node:events";

const bus = new EventEmitter();
bus.on("order:paid", (order) => console.log("发货:", order.id));
bus.emit("order:paid", { id: 42 });
```

适合解耦"主流程"和"附加动作"(下单后发通知、记日志)。Express、Fastify 这些框架底层同样是事件驱动的。

## 错误处理兜底

async 函数里的错误用 `try/catch` 接;漏接的 Promise 拒绝会触发进程级事件,生产服务至少要记录而不是崩溃退出:

```js
process.on("unhandledRejection", (reason) => {
  console.error("未处理的 Promise 拒绝:", reason);
});
```

## 动手练习

1. 写一个脚本,统计 `access.log` 里出现最多的 5 个 IP,先用 `readFile` 全量实现,再改成流式逐行处理;
2. 给 `http` 版服务加一个 `/time` 路由返回当前时间 JSON,再用 `curl` 验证;
3. 用 `pipeline` 把一个大文件的奇偶行分别写入两个输出文件,任务管理器观察内存是否恒定。
