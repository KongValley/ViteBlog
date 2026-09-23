---
title: Go 精通（五）：并发——Goroutine、Channel 与 sync
date: 2026-09-23 13:00:00
cover: /ViteBlog/images/covers/go-guide__go-05-concurrency.jpg
tags:
  - Go
  - 精通
  - 并发
  - goroutine
categories:
  - Go
excerpt: 并发是结构，并行是执行。从 goroutine 的启动成本讲到 channel、select、sync、context，最后用 race detector 把数据竞争钉死。
---

上一篇：[接口与错误处理](/post/go-guide/go-04-interfaces-errors)。

前面四篇讲的都是单线程世界里的组织方式：类型、函数、接口、错误。并发是 Go 相对其他语言最大的差异点——它不是库，而是语言内建的执行模型。这篇把它拆开讲完：goroutine 怎么起、channel 怎么用、什么时候该用锁、取消怎么传播、竞争怎么查。

## 并发不是并行

并发（concurrency）说的是**结构**：把问题拆成若干可以独立推进的部分，让它们交错执行。并行（parallelism）说的是**执行**：同一时刻真的有多条指令在多个核上跑。并发程序可以在单核上跑得正确，并行只是并发的一种执行结果。

Go 里并发的单位是 goroutine，用 `go` 关键字启动：

```go
package main

import (
	"fmt"
	"sync"
)

func main() {
	var wg sync.WaitGroup
	for i := 1; i <= 3; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			fmt.Println("worker", i)
		}()
	}
	wg.Wait()
}
```

> Go 1.22 起循环变量每轮迭代都是新的，闭包里直接捕获 `i` 是安全的；更早的版本需要 `i := i` 或把 `i` 作为参数传进去。

goroutine 很便宜：初始栈只有几 KB，按需增长收缩，起几万个也不算离谱；真正的成本在调度和同步，不在内存。

调度器用 GMP 模型：

- **G（goroutine）**：一段待执行的代码加它的栈。
- **M（machine）**：操作系统的线程，真正被 CPU 执行的东西。
- **P（processor）**：逻辑处理器，持有一个可运行 G 的本地队列，数量默认等于 `GOMAXPROCS`（即 CPU 核数）。

M 必须绑到一个 P 才能执行 G。G 阻塞在 channel、锁或系统调用上时，调度器会让出这个 M 或另找一个 M 继续跑其他 P 上的 G，所以单个 goroutine 阻塞不会卡住整个程序。切换在用户态完成，成本远低于线程。

两个必须记住的坑：

- `main` 返回时进程直接退出，所有还在跑的 goroutine 被无声地终止。
- `time.Sleep` **不是**同步手段：它只睡一会儿，不保证别的 goroutine 做完。要等待就用 `sync.WaitGroup` 或 channel。

## channel 基础

channel 是 goroutine 之间传递数据的管道，用 `make` 创建：

```go
ch := make(chan int)     // 无缓冲
buf := make(chan int, 3) // 缓冲容量 3
```

- **无缓冲**是一次**交接**：发送方阻塞到有人接收，接收方阻塞到有人发送。
- **有缓冲**是一个**队列**：缓冲区没满时发送不阻塞，没空时接收不阻塞；满了再发才阻塞。

方向也写进类型里，函数签名可以只暴露单方向：

```go
func produce(out chan<- int) {}  // 只发
func consume(in <-chan int) {}   // 只收
```

`close` 表示"不会再有新值了"，遍历到关闭就自然结束：

```go
package main

import "fmt"

func main() {
	ch := make(chan int)
	go func() {
		for i := 1; i <= 3; i++ {
			ch <- i
		}
		close(ch)
	}()

	for v := range ch {
		fmt.Println(v)
	}
}
```

规则只有四条：

- `close` **只能由发送方调用**。接收方关通道会让发送方 panic。
- 向已关闭的 channel 发送会 panic；从已关闭的 channel 接收不会，会立刻拿到零值和 `ok == false`。
- 已经关闭的 channel 再关一次也 panic。
- **nil channel 永久阻塞**，无论收发。这常被用来在 `select` 里动态屏蔽某个分支。

```go
v, ok := <-ch // ok 为 false 说明通道已关闭且值已取完
```

## select 多路复用

`select` 在多个 channel 操作间等第一个就绪的：

```go
package main

import (
	"fmt"
	"time"
)

func main() {
	ch := make(chan string)
	go func() {
		time.Sleep(50 * time.Millisecond)
		ch <- "done"
	}()

	select {
	case v := <-ch:
		fmt.Println(v)
	case <-time.After(time.Second):
		fmt.Println("timeout")
	}
}
```

加 `default` 就变成非阻塞尝试，一个都不可用时立刻走 `default`：

```go
select {
case v := <-ch:
	fmt.Println("got", v)
default:
	fmt.Println("nothing ready")
}
```

真正在服务里跑的是事件循环骨架：`for` 套 `select`，用一个 `done chan struct{}` 作为退出信号，`close(done)` 能让**所有**等待者同时收到通知（零值 `struct{}` 不占内存）：

```go
done := make(chan struct{})

go func() {
	for {
		select {
		case msg := <-msgs:
			handle(msg)
		case <-done:
			return
		}
	}
}()

// 需要停止时
close(done)
```

> 生产代码里超时和取消优先用 `context`：`time.After` 每次调用都会新建定时器，放在循环里会持续泄漏到触发为止；`ctx.Done()` 可复用、可级联。

## sync 包

channel 适合传递数据，锁适合保护状态。`sync` 提供后者。

`Mutex` 和 `RWMutex` 的**零值可用**，不用初始化：

```go
type Counter struct {
	mu sync.Mutex
	n  int
}

func (c *Counter) Inc() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.n++
}

func (c *Counter) Value() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.n
}
```

- `defer` 解锁保证 panic 时也能释放，别手写 `Unlock`。
- **锁不能复制**：`Counter` 的方法用指针接收者，`sync` 类型传值会触发 `go vet` 报错，复制出的锁等于两把锁。
- `RWMutex` 允许多个读者并存、写者独占，读远多于写时才划算，否则记账成本反而更慢。

`WaitGroup` 等待一组 goroutine 结束，关键是 **`Add` 必须在启动 goroutine 之前调用**，否则 `Wait` 可能提前返回：

```go
var wg sync.WaitGroup
for i := 0; i < 5; i++ {
	wg.Add(1) // 先 Add
	go func() {
		defer wg.Done()
		work()
	}()
}
wg.Wait()
```

`Once` 保证初始化只执行一次且对所有 goroutine 可见，写单例最干净：

```go
var (
	once   sync.Once
	config map[string]string
)

func loadConfig() map[string]string {
	return map[string]string{"env": "dev"}
}

func Config() map[string]string {
	once.Do(func() {
		config = loadConfig()
	})
	return config
}
```

`sync.Map` 只在**读多写少且键集合基本稳定**时有优势（比如进程级缓存、注册表）：`cache.Store(k, v)`、`cache.Load(k)`、`cache.LoadOrStore(k, v)`。一旦需要遍历、求长度、按条件删除，就该退回普通 `map` + `Mutex`。

整数计数用 `sync/atomic` 的原子类型，比锁轻，也自动防止复制：

```go
package main

import (
	"fmt"
	"sync"
	"sync/atomic"
)

func main() {
	var count atomic.Int64
	var wg sync.WaitGroup
	for i := 0; i < 1000; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			count.Add(1)
		}()
	}
	wg.Wait()
	fmt.Println(count.Load()) // 1000
}
```

## context 与取消传播

`context` 解决的是"这件事该停了"。根节点是 `context.Background()`，往下派生：

```go
ctx, cancel := context.WithCancel(parent)                 // 手动取消
ctx, cancel := context.WithTimeout(parent, 3*time.Second) // 超时自动取消
ctx, cancel := context.WithDeadline(parent, deadline)     // 到点自动取消
```

**`cancel` 必须调用**（通常 `defer cancel()`），否则父 context 会一直持有子节点的引用直到超时，造成泄漏。

`ctx` 作为函数第一个参数往下传，是 Go 的硬约定，标准库所有可能阻塞的 API 都接受它：

```go
func fetch(ctx context.Context, url string) ([]byte, error) {
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	resp, err := http.DefaultClient.Do(req) // 取消会直接中断这个请求
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}
```

被调方用 `<-ctx.Done()` 感知取消，用 `ctx.Err()` 拿到原因（`context.Canceled` 或 `context.DeadlineExceeded`）：

```go
package main

import (
	"context"
	"fmt"
	"time"
)

func worker(ctx context.Context) error {
	select {
	case <-time.After(200 * time.Millisecond):
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	if err := worker(ctx); err != nil {
		fmt.Println("canceled:", err) // canceled: context deadline exceeded
	}
}
```

取消沿调用链向下传播：父被取消，所有派生的子 context 立刻一起 `Done`；但**向上不传播**，上层通过 `ctx.Err()` 主动判断。

最后一条纪律：不要用 `context.WithValue` 传业务参数。它只装请求级元数据——trace id、认证主体这类跨层且沿途谁都可能要的东西，且键要用自定义类型避免冲突：

```go
type ctxKey struct{}

ctx = context.WithValue(ctx, ctxKey{}, traceID)
```

## 并发模式

**worker pool**：固定 N 个 worker 从任务 channel 取活，主协程发完就 `close`，另一个协程等全部结束后关结果 channel：

```go
package main

import (
	"fmt"
	"sync"
)

func main() {
	jobs := make(chan int, 100)
	results := make(chan int, 100)

	var wg sync.WaitGroup
	const workers = 3
	for w := 0; w < workers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := range jobs {
				results <- j * j
			}
		}()
	}

	for i := 1; i <= 9; i++ {
		jobs <- i
	}
	close(jobs)

	go func() {
		wg.Wait()
		close(results) // 所有 worker 退出后才能关
	}()

	sum := 0
	for r := range results {
		sum += r
	}
	fmt.Println("sum:", sum) // 285
}
```

要点：`close(jobs)` 是"没有更多任务了"的信号，worker 的 `range` 因此结束；`close(results)` 必须等 `wg.Wait()`，否则还在写的 worker 会 panic。

**pipeline**：每一级是一个函数，入参出参都是 channel，级与级串成流水线：

```go
func gen(nums ...int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for _, n := range nums {
			out <- n
		}
	}()
	return out
}

func square(in <-chan int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for n := range in {
			out <- n * n
		}
	}()
	return out
}
```

**fan-out / fan-in** 是它的变体：把同一级复制成多个 goroutine 并行消费（fan-out），再把多个输出 channel 合并到一个（fan-in）。合并那一步通常要开一个 goroutine 专门 `wg.Wait()` 后关闭输出。

实际项目里这套编排，标准库只给到 `sync.WaitGroup` 和 `context`，社区用 `golang.org/x/sync/errgroup` 补上"任意一个出错就取消其余任务、并返回第一个错误"的语义；它是第三方模块，本篇不引入。

## 数据竞争

数据竞争的定义很精确：两个 goroutine **并发访问同一块内存**，其中**至少一个是写**，且**没有同步**。Go 的内存模型不给这种访问任何保证——结果不是"某个值"也不是"随机值"，而是未定义行为，随编译器优化、CPU 架构、运行时负载而变。

```go
package main

import (
	"fmt"
	"sync"
)

func main() {
	counter := 0
	var wg sync.WaitGroup
	for i := 0; i < 1000; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			counter++ // 数据竞争：读-改-写不是原子操作
		}()
	}
	wg.Wait()
	fmt.Println(counter) // 通常小于 1000，但具体多少不确定
}
```

`counter++` 是"读 → 加一 → 写"三步，交错执行就会丢更新。

Race detector 在编译期插桩，竞争发生时直接打印完整的两处栈：

```bash
go test -race ./...
go run -race main.go
go build -race -o app.exe
```

> `go vet` 只能查静态可疑点（复制锁、`Printf` 参数错误等），查不到数据竞争。竞争取决于实际交错，只有 race detector 能抓到。CI 里至少给并发相关的包开 `-race`；它会让程序慢几倍，但换来的是确定性。

修法一，加锁：

```go
type Counter struct {
	mu sync.Mutex
	n  int
}

func (c *Counter) Inc() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.n++
}
```

修法二，用原子类型：

```go
var counter atomic.Int64
counter.Add(1)
fmt.Println(counter.Load())
```

只保护一个整数时 `atomic` 更快；一旦要同时更新多个字段、或者要保证"两个操作作为一个整体"，就必须用锁。

## 一条设计原则

> 不要通过共享内存来通信，而要通过通信来共享内存。

它的实际含义是：不要把一块可变状态暴露给多个 goroutine 各自加锁修改，而是让**一个** goroutine 独占这份状态，其他人通过 channel 发消息给它。所有权集中在一处，所有修改都发生在同一个 goroutine 里，竞争从"需要小心避免"变成"结构上不可能"。`select` 事件循环就是这条原则的模板。

但锁也不是坏东西。保护**一小块简单状态**（一个计数、一个字段）、读多写少或临界区极短、访问者只是想安全地读或写时，直接用锁更简单清晰。

判断标准很朴素：**如果这份状态需要串行化的逻辑而不只是存取，用 channel 把逻辑收进一个 goroutine；如果只是存取，用锁。**

## 小结

- goroutine 便宜但 `main` 一返回就全没了；等待靠 `WaitGroup`，不靠 `time.Sleep`。
- channel 的关闭规则只有发送方能 `close`；nil channel 永久阻塞，可用来屏蔽 `select` 分支。
- `select` + `context` 是超时和取消的标准组合，`cancel` 必须调用，取消沿链向下传播。
- 锁保护状态、channel 传递数据；`WaitGroup.Add` 要在起 goroutine 之前，锁不能复制。
- 竞争是未定义行为，`go vet` 查不出来，必须靠 `-race`。

下一篇：[泛型与标准库实战](/post/go-guide/go-06-generics-stdlib)。