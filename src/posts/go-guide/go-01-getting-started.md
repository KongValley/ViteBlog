---
title: Go 入门（一）：环境搭建、第一个程序与工具链
date: 2026-09-23 09:00:00
cover: /ViteBlog/images/covers/go-guide__go-01-getting-started.jpg
tags:
  - Go
  - 入门
  - 环境搭建
  - go mod
categories:
  - Go
excerpt: 从安装 Go 工具链到跑通第一个 hello world，把 go mod、go run/build/install 和常用命令一次讲清，顺带交代 GOPATH 是怎么被模块模式取代的。
---

Go 是 Google 2009 年开源的静态类型编译型语言。它的设计目标很具体：编译要快、部署要简单、并发要好写。本系列七篇从环境搭建一路讲到测试与性能调优，这篇先把工具链跑通。

## 为什么是 Go

Go 是静态类型语言，编译器直接把代码和运行时编成**单个二进制文件**，没有虚拟机、不依赖 libc 之外的动态库，扔到服务器上就能跑。语言层面内置 goroutine 和 channel，并发不是靠库拼出来的，而是语法和运行时的一等公民。

标准库覆盖面很广：`net/http` 写服务、`encoding/json` 处理 JSON、`crypto` 系列做加密，日常后端需求基本不用第三方包。启动快、常驻内存小，适合容器里跑。云原生生态里 Docker、Kubernetes、etcd、Prometheus、Terraform 都是 Go 写的，这反过来又让 Go 的库和工具链更成熟。

## 安装与验证

各平台安装方式不同，装完都要能执行 `go version`。

Windows：官网下载 MSI 安装包，双击按向导装完即可，安装器会自动配好 `PATH`。也可以下 zip 包解压到任意目录，然后手动把解压后的 `bin` 目录（例如 `C:\go\bin`）加进系统环境变量 `PATH`。

macOS：用 Homebrew 最省事。

```bash
brew install go
```

Linux：发行版仓库里通常有 `golang` 包，直接用包管理器装；想要更新的版本就从官网下载 tar.gz 解压到 `/usr/local`。

```bash
wget https://go.dev/dl/go1.27.1.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.27.1.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin
```

验证安装，并查看两个关键环境变量：

```bash
go version
# go version go1.27.1 linux/amd64

go env GOROOT GOPATH
# /usr/local/go
# /home/you/go
```

`GOROOT` 是 Go 自己的安装目录，`GOPATH` 是工作目录。Linux/macOS 上把 `export PATH=$PATH:/usr/local/go/bin` 写进 `~/.bashrc` 或 `~/.zshrc`，否则新开的终端里 `go` 又找不到了。

## GOPATH 时代与 go mod

Go 1.11 之前没有模块，所有代码必须放在 `$GOPATH/src` 下面，import 路径就是相对这个目录的路径。这带来两个麻烦：项目不能放在磁盘任意位置；同一个依赖无法同时保留多个版本，A 项目要 v1、B 项目要 v2 时只能二选一。

Go 1.11 引入模块（module），1.16 起默认开启。现在 `GOPATH` 不再限制代码位置——项目放哪都行，只要目录里有 `go.mod`。`GOPATH` 只剩下两个职责：存放下载的依赖缓存，以及 `go install` 出来的可执行文件。

```bash
go env GOMODCACHE
# /home/you/go/pkg/mod
```

`GOMODCACHE` 就是模块缓存目录，所有下载过的依赖版本都摊在这里，多个项目共享，不会重复下载。

## 第一个程序

新建一个目录，写一个 `hello.go`：

```go
package main

import "fmt"

func main() {
	fmt.Println("Hello, Go!")
}
```

逐行看：

- `package main`：声明这个文件属于 `main` 包。Go 以包为编译单位，而名为 `main` 的包会被编译成**可执行程序**；其他名字的包只能编译成库。
- `import "fmt"`：导入格式化输入输出包，`Println` 来自它。
- `func main()`：`main` 包里的 `main` 函数是程序入口，无参数、无返回值，运行时从这里开始执行。

Go 用**首字母大小写**控制可见性：标识符首字母大写表示导出（包外可访问），小写则只在包内可见。没有 `public`/`private` 关键字，`fmt.Println` 的 `P` 大写正是这个原因。

运行它：

```bash
go run hello.go
# Hello, Go!
```

## go run / go build / go install

三个命令都和编译有关，区别在产物：

- `go run hello.go`：编译到临时目录并立刻执行，不留产物。适合开发时快速验证。
- `go build`：编译并在当前目录留下二进制。`go build` 不带文件名时，编译当前目录对应的包；带 `-o` 可以指定输出名。
- `go install`：编译后把二进制放进 `$GOPATH/bin`（或 `GOBIN` 指定的目录）。这个目录通常在 `PATH` 里，装完就能全局调用。

```bash
go build -o hello hello.go
./hello            # Hello, Go!

go install .
# 二进制出现在 $(go env GOPATH)/bin 下
```

Go 的交叉编译只靠两个环境变量，不需要额外的工具链：

```bash
GOOS=linux GOARCH=amd64 go build -o hello-linux
```

在 Windows 的 PowerShell 里写法是 `$env:GOOS="linux"; $env:GOARCH="amd64"; go build`。细节和构建矩阵留到第七篇展开。

## 模块与依赖

进入项目目录，初始化模块：

```bash
go mod init example.com/hello
```

生成的 `go.mod` 只有两行内容（外加可能存在的依赖块）：

```text
module example.com/hello

go 1.27
```

- `module example.com/hello`：模块路径，也是这个模块内所有包 import 时的前缀。它只是个标识符，用真实仓库地址（如 `github.com/you/hello`）是惯例，但本地项目写个假域名也能跑。
- `go 1.27`：声明这个模块期望的 Go 语言版本，编译器据此启用对应的语言特性和行为。

添加依赖用 `go get`，它会更新 `go.mod` 并记录版本：

```bash
go get golang.org/x/text@v0.16.0
```

`go.sum` 是自动生成的文件，记录每个依赖（含间接依赖）的内容哈希，用来校验下载的包没被篡改。它必须提交进版本库。`go mod tidy` 负责整理：删掉没用到的依赖，补上代码里 import 但 `go.mod` 里漏掉的，并同步 `go.sum`。

```bash
go mod tidy
```

国内网络直连 proxy.golang.org 通常很慢，换一个代理：

```bash
go env -w GOPROXY=https://goproxy.cn,direct
```

`direct` 表示代理没命中时直接走源站。这条设置会写进 `go env` 的配置文件，一次性生效，不用每次敲。

## 常用命令速查

| 命令 | 作用 |
| --- | --- |
| `go fmt ./...` | 按官方格式重排代码，Go 的格式没有争论空间 |
| `go vet ./...` | 静态检查可疑写法，如格式串参数不匹配 |
| `go test ./...` | 运行所有包的测试 |
| `go doc fmt.Println` | 在终端查看包或符号的文档 |
| `go mod tidy` | 增删依赖，使 `go.mod` 与实际 import 一致 |
| `go list -m all` | 列出当前模块依赖的全部模块及版本 |
| `go clean -cache` | 清空构建缓存，排查诡异的编译问题时用 |

## 目录结构约定

Go 官方没有强制目录规范，但社区形成了一套共识，中大型项目基本照这个来：

```text
hello/
├── cmd/
│   └── server/
│       └── main.go      # 可执行入口，只做参数解析和组装
├── internal/
│   └── store/
│       └── store.go     # 仅本模块可导入的实现细节
├── pkg/
│   └── httpx/
│       └── httpx.go     # 可以被外部项目导入的公共库
├── go.mod
└── go.sum
```

- `cmd/`：每个子目录是一个可执行程序，`main.go` 只负责把 `internal` 里的组件拼起来，不放业务逻辑。
- `internal/`：Go 编译器**强制**的可见性规则——`internal` 目录下的包只能被它的父目录及其子目录下的代码导入。模块外的项目即使拿到你的仓库路径也 import 不了，这是官方认可的"私有"机制。
- `pkg/`：对外暴露、允许别人导入的库代码。注意它只是约定，没有编译器层面的保护。

小项目不必照搬，一个 `main.go` 加几个文件就够了；等包的数量超过五六个，再按上面的结构拆分。

## 小结

- Go 编译成单个静态二进制，内置并发，标准库够用，云原生生态以它为基底
- 模块模式（`go.mod`）取代了 `GOPATH/src` 的时代，`GOPATH` 现在只负责缓存和装二进制
- `go run` 不留产物，`go build` 留在当前目录，`go install` 装到 `$GOPATH/bin`
- `go.mod` 声明模块路径和语言版本，`go.sum` 校验依赖哈希，`go mod tidy` 保持两者一致
- `internal/` 由编译器强制限制导入范围，`cmd/` 和 `pkg/` 只是社区约定

下一篇：[变量、常量与基础类型](/post/go-guide/go-02-basic-types)。