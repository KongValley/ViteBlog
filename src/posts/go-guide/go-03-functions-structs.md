---
title: Go 进阶（三）：函数、方法与结构体
date: 2026-09-23 11:00:00
cover: /ViteBlog/images/covers/go-guide__go-03-functions-structs.jpg
tags:
  - Go
  - 进阶
  - 结构体
  - 方法
categories:
  - Go
excerpt: 函数签名与多返回值、defer 的求值时机、值接收者与指针接收者、结构体嵌入与组合、struct tag 与 JSON 序列化，以及 Go 的构造函数惯例。
---

前两篇把工具链、变量和基础类型过了一遍。这篇补上组织代码的三块砖：**函数、方法、结构体**。

上一篇：[变量、常量与基础类型](/post/go-guide/go-02-basic-types)。

## 函数签名与多返回值

声明形式是 `func 名字(参数) 返回值`，相邻同类型参数可以合并：

```go
func add(a, b int) int {
	return a + b
}
```

多返回值里最典型的是「结果 + error」，错误是**返回值**而不是异常：

```go
func div(a, b int) (int, error) {
	if b == 0 {
		return 0, fmt.Errorf("division by zero")
	}
	return a / b, nil
}
```

调用方必须显式处理第二个值。error 的完整玩法留给第四篇。

返回值可以命名，它们在函数开始时声明为零值，`return` 不带参数时直接返回：

```go
func split(sum int) (x, y int) {
	x = sum * 4 / 9
	y = sum - x
	return
}
```

短函数里这样能少写一遍返回值列表，但**长函数里不要用**：裸 `return` 让读者得回头找变量在哪被改过。它真正的用途是配合 `defer`（见下文）。

可变参数用 `...T`，函数内拿到的是一个切片：

```go
func sum(nums ...int) int {
	total := 0
	for _, n := range nums {
		total += n
	}
	return total
}

nums := []int{1, 2, 3}
sum(nums...) // 用 s... 展开切片,等价于 sum(1, 2, 3)
```

## 函数是一等公民

函数是值，可以赋给变量、传参、返回。函数类型就是签名去掉名字：

```go
func apply(nums []int, f func(int) int) []int {
	out := make([]int, len(nums))
	for i, n := range nums {
		out[i] = f(n)
	}
	return out
}

type Middleware func(http.Handler) http.Handler // 别名让签名可读
```

闭包捕获外部变量，是「函数携带状态」的常规手段：

```go
func counter() func() int {
	n := 0
	return func() int {
		n++
		return n
	}
}
```

Go 1.22 修改了循环变量语义：**每轮迭代都是新变量**，闭包捕获当轮的值；1.21 及以前共享同一个变量，得靠 `i := i` 手动拷贝。

```go
funcs := make([]func(), 3)
for i := range 3 { // range 后直接跟整数也是 1.22 的新写法
	funcs[i] = func() { fmt.Println(i) }
}
// 依次输出 0 1 2;1.21 及以前是 3 3 3
```

## defer

`defer` 把调用推迟到**外层函数返回之后**执行，常用于关文件、解锁、记录耗时：

```go
func readAll(path string) ([]byte, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close() // 注册在 err 检查之后,避免 nil 解引用
	return io.ReadAll(f)
}
```

同一函数里的多个 `defer` 按 **LIFO(后进先出)** 执行：

```go
defer fmt.Println("注册 1,最后执行")
defer fmt.Println("注册 2")
defer fmt.Println("注册 3,最先执行")
// 函数体结束 → 注册 3 → 注册 2 → 注册 1
```

关键细节：`defer` 后面的**参数在注册那一刻就求值**，只有调用本身被推迟：

```go
x := 1
defer fmt.Println("deferred x =", x) // 注册时求值,永远打印 1
x = 100
fmt.Println("current x =", x) // 100
```

想推迟求值，得包一层闭包 `defer func() { fmt.Println(x) }()`。

`defer` 跑在 `return` 赋值之后，所以能改命名返回值：

```go
func double(n int) (result int) {
	defer func() { result *= 2 }()
	return n + 1
}
// double(3) == 8
```

::: warning 别把 defer 当瑞士军刀
这种「偷偷改返回值」的写法在错误包装、耗时统计里确实存在，但让控制流不直观。只在确需统一兜底时使用，常规路径请老老实实 `return`。
:::

## 方法

方法就是**带接收者的函数**，接收者写在 `func` 和名字之间：

```go
type Counter struct{ n int }

func (c Counter) Value() int { return c.n } // 值接收者
func (c *Counter) Inc()      { c.n++ }      // 指针接收者

c := &Counter{}
c.Inc()
fmt.Println(c.Value()) // 1
```

区别只有两条：**值接收者**拿到副本，改不动原值；它每次调用还会复制一份，结构体大时是真实开销。由此推出方法集规则，它决定类型能否满足接口：

- `*T` 的方法集包含值接收者与指针接收者方法；
- `T` 的方法集只包含值接收者方法。

```go
type Incer interface{ Inc() }

var _ Incer = (*Counter)(nil) // ✅ *Counter 满足
var _ Incer = Counter{}       // ❌ 编译错误:方法集里没有 Inc
```

默认选择：**只要有需要修改的字段，或结构体不小，就统一用指针接收者**，同一类型的方法风格保持一致。

方法必须和类型定义在**同一个包**里；要给 `int` 加方法，得先 `type MyInt int` 定义自己的类型。

## 结构体

结构体把一组字段打包成类型，字面量有两种写法：

```go
type Point struct {
	X, Y int
}

p := Point{X: 1, Y: 2} // 字段名写法,推荐
q := Point{1, 2}       // 位置写法:加一个字段就全部错位,不推荐
```

Go 没有构造函数语法糖，但有更重要的约定：**结构体零值应当直接可用**。标准库的 `sync.Mutex`、`bytes.Buffer` 都是这个哲学——声明完就能用。

能否用 `==` 比较，取决于**所有字段是否可比较**：

```go
type A struct{ X int; Y string } // ✅ 可比较
type B struct{ X []int }          // ❌ 含 slice/map/func,== 无法编译
```

比较含 slice/map 的结构体可用 `reflect.DeepEqual` 兜底，但它靠反射且对 `nil` 与空切片判定有坑。

## 嵌入与组合

Go 没有继承，只有**组合**。结构体里写一个没有字段名的类型叫匿名字段，也就是「嵌入」：

```go
type Logger struct{ Prefix string }

func (l Logger) Log(msg string) { fmt.Printf("[%s] %s\n", l.Prefix, msg) }

type Config struct{ Addr string }

type Server struct {
	Logger
	*Config
}

s := &Server{Logger: Logger{Prefix: "http"}, Config: &Config{Addr: ":8080"}}
s.Log("starting")   // 方法提升,等价于 s.Logger.Log("starting")
fmt.Println(s.Addr) // 字段提升,等价于 s.Config.Addr
```

嵌入是「has-a + 借用行为」，不是「is-a」——`Server` 并不是 `Logger`。同名成员会被**外层遮蔽**，两个内层同层冲突则编译错误：

```go
type A struct{ Name string }
type B struct{ Name string }

type C struct {
	A
	B
}

c := C{}
// c.Name // ❌ ambiguous selector:A.Name 与 B.Name 冲突
fmt.Println(c.A.Name) // 必须显式指定路径
```

## 标签与序列化

struct tag 是字段后的反引号字符串，`key:"value"` 形式，给反射读取：

```go
package main

import (
	"encoding/json"
	"fmt"
)

type User struct {
	ID       int    `json:"id"`
	Name     string `json:"name,omitempty"`
	Password string `json:"-"`
	age      int    // 未导出字段,序列化时被忽略
}

func main() {
	b, err := json.Marshal(User{ID: 1, Name: "Alice", Password: "s3cret", age: 30})
	if err != nil {
		panic(err)
	}
	fmt.Println(string(b)) // {"id":1,"name":"Alice"}
}
```

三条规则要记牢：

- `json:"-"` 完全忽略字段；`omitempty` 在字段为零值时省略输出。
- **只有导出字段（首字母大写）会被序列化**，`age` 直接消失，不需要 tag。
- 导出 = 首字母大写，这是 Go 唯一的可见性规则：大写跨包可见，小写只在本包可见。

反序列化用 `json.Unmarshal`，字段匹配优先看 tag，其次做大小写不敏感匹配。

## 构造函数惯例

Go 的构造函数就是普通函数，名字约定 `New<类型名>`：

```go
type Server struct {
	Config *Config
	Name   string
}

func NewServer(addr string) *Server {
	return &Server{Config: &Config{Addr: addr}, Name: "api"}
}
```

需要**修改状态**、结构体较大、或可能返回 `nil` 时返回指针，小而不可变的值类型返回值为好。判断标准只有一条：调用方需不需要共享同一份数据。

构造函数一定会失败时，标准库惯例是 `MustXxx`——失败直接 panic，只在初始化阶段使用：

```go
func MustParse(pattern string) *regexp.Regexp {
	re, err := regexp.Compile(pattern)
	if err != nil {
		panic(err)
	}
	return re
}
```

最后给类型实现 `String() string`，它就能被 `fmt` 自动调用：

```go
func (s *Server) String() string {
	return "server@" + s.Config.Addr
}
```

`fmt.Stringer` 就是只含 `String() string` 的接口，接口怎么定义、怎么满足是第四篇的主题。

## 小结

- 多返回值承载「结果 + error」；命名返回值只在短函数或配合 defer 时用，可变参数用 `...T` 加 `s...` 展开。
- 函数是值，可传可返；闭包捕获变量，Go 1.22 起每轮循环迭代都有独立变量。
- defer 按 LIFO 执行、参数在注册时求值；只有指针接收者能改原值，`T` 与 `*T` 的方法集不同。
- 结构体零值应可直接使用；组合靠匿名字段提升，冲突会被遮蔽或报错。
- 只有导出字段参与 JSON 序列化；构造函数惯例是 `NewXxx` / `MustXxx`。

下一篇：[接口与错误处理](/post/go-guide/go-04-interfaces-errors)。