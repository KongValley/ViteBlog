---
title: Go 进阶（四）：接口与错误处理
date: 2026-09-23 12:00:00
cover: /ViteBlog/images/covers/go-guide__go-04-interfaces-errors.jpg
tags:
  - Go
  - 进阶
  - 接口
  - 错误处理
categories:
  - Go
excerpt: Go 没有 implements 关键字，方法集对上就是实现；error 本身也是一个接口。从接口值的内部结构讲到 %w 包装、errors.Is/As/Join,再到 panic 与 recover 的适用边界。
---

上一篇：[函数、方法与结构体](/post/go-guide/go-03-functions-structs)。方法定义好了之后，Go 的抽象就靠接口来组织：实现是隐式的，而 `error` 本身就是最常用的接口。这篇把接口和错误处理放在一起讲，因为 Go 里它们本来就是同一件事。

## 隐式实现

Go 没有 `implements`，也没有继承声明。一个类型只要**方法集覆盖**了接口的全部方法，就自动实现了它：

```go
type Logger interface {
	Log(msg string)
}

type StdLogger struct{}

func (StdLogger) Log(msg string) { fmt.Println(msg) }

var _ Logger = StdLogger{} // 编译期断言:不满足就直接编译失败
```

`var _ Logger = ...` 这一行是惯用写法：把 `nil` 赋给空白标识符，编译器顺手做一次接口满足性检查，零运行时开销。指针接收者实现接口时，断言写成 `var _ io.Writer = (*Buf)(nil)`。

接口应该定义在**使用方**，而不是实现方。消费方只需要自己用得到的那几个方法，于是接口天然很小——标准库里的 `io.Reader` 和 `io.Writer` 各只有一个方法，却能拼出整个 I/O 生态：

```go
type Reader interface {
	Read(p []byte) (n int, err error)
}

type Writer interface {
	Write(p []byte) (n int, err error)
}
```

::: tip 小接口
"接口越大，抽象越弱。" 一个方法一个接口，组合起来用（`io.ReadWriter`），比预先设计一个大接口灵活得多。
:::

## 接口值里装了什么

接口变量是两个字：**动态类型 + 值**。只有两者都为 nil，接口本身才是 nil。这个区别是 Go 最经典的坑：

```go
package main

import "fmt"

type MyError struct{ Msg string }

func (e *MyError) Error() string { return e.Msg }

func lookup() error {
	var e *MyError // 声明了但没赋值,是个 nil 指针
	return e
}

func main() {
	err := lookup()
	fmt.Println(err == nil) // false
}
```

`lookup` 返回的接口有动态类型 `*MyError`、值为 nil，所以 `err != nil` 成立。调用方照常进入错误分支，拿到一个 `Error()` 里会空指针解引用的对象。

修法有两种：一是明确返回 nil，`return nil`；二是让方法对 nil 接收者安全：

```go
func (e *MyError) Error() string {
	if e == nil {
		return "<nil>"
	}
	return e.Msg
}
```

空接口 `any`（`interface{}` 的别名，1.18 起可用）可以装任何值，代价是取出来时必须断言。

## 类型断言与 type switch

`v, ok := x.(T)` 是带检查的断言，失败时 `ok` 为 false，不会 panic；不带 `ok` 的形式失败会直接 panic。JSON 解码后分支是最常见的场景：

```go
package main

import (
	"encoding/json"
	"fmt"
)

func main() {
	raw := []byte(`{"kind":"user","name":"ada"}`)

	var v any
	if err := json.Unmarshal(raw, &v); err != nil {
		panic(err)
	}

	m, ok := v.(map[string]any)
	if !ok {
		fmt.Println("顶层不是对象")
		return
	}
	fmt.Println(m["name"]) // ada
}
```

分支多于两个时，用 type switch：

```go
func describe(v any) string {
	switch x := v.(type) {
	case nil:
		return "nil"
	case string:
		return "string:" + x
	case int, int64:
		return fmt.Sprintf("整数:%v", x) // 多个类型时 x 仍是 any
	case error:
		return "error:" + x.Error()
	default:
		return fmt.Sprintf("其他:%T", x)
	}
}
```

给日志加结构化字段时，这个写法很实用：值可能是 string、int 或 `fmt.Stringer`，分别取值塞进不同的字段类型。

## 标准库里的常见接口

- `error`：只有一个 `Error() string`，见下一节。
- `fmt.Stringer`：`String() string`，实现了它，`fmt.Println` 与 `%v` 就会调用它。
- `sort.Interface`：`Len`/`Less`/`Swap` 三件套。新代码基本不再自己实现，直接用 `slices.SortFunc` 配 `cmp.Compare`。
- `encoding/json` 的 `json.Marshaler`（`MarshalJSON() ([]byte, error)`）：控制自定义序列化格式。

```go
package main

import (
	"cmp"
	"fmt"
	"slices"
)

type User struct {
	Name string
	Age  int
}

func main() {
	users := []User{{"bob", 30}, {"ada", 20}}
	slices.SortFunc(users, func(a, b User) int {
		return cmp.Compare(a.Age, b.Age)
	})
	fmt.Println(users) // [{ada 20} {bob 30}]
}
```

`fmt.Stringer` 的写法：

```go
type Point struct{ X, Y int }

func (p Point) String() string { return fmt.Sprintf("(%d,%d)", p.X, p.Y) }
```

## error 就是接口

标准库里的定义只有三行：

```go
type error interface {
	Error() string
}
```

任何实现了 `Error() string` 的类型都是错误。惯例有三条：

1. error 是**最后一个返回值**，`(T, error)`，不要放在中间。
2. 拿到就判：`if err != nil { ... }`，立刻处理或立刻返回，别攒着。
3. error 只表示失败，不要拿它当控制流传递业务数据。

## 哨兵错误与自定义错误

包级别的公开错误值叫哨兵（sentinel），调用方可以用它做判断：

```go
var ErrNotFound = errors.New("not found")
```

需要携带上下文时，定义自己的错误类型：

```go
package main

import (
	"errors"
	"fmt"
)

var ErrNotFound = errors.New("not found")

type PathError struct {
	Path string
	Err  error
}

func (e *PathError) Error() string { return e.Path + ": " + e.Err.Error() }
func (e *PathError) Unwrap() error { return e.Err }

func load(path string) error {
	if path == "" {
		return ErrNotFound
	}
	return &PathError{Path: path, Err: ErrNotFound}
}

func main() {
	err := load("config.yaml")
	fmt.Println(errors.Is(err, ErrNotFound)) // true
	fmt.Println(err)                         // config.yaml: not found
}
```

`Unwrap` 是关键：它把错误链交给 `errors.Is` / `errors.As` 遍历。

接收者的取舍：错误类型通常用**指针接收者**——错误对象本身应当是不可变的值，指针也避免了每次返回时的复制，还能让 `errors.As` 的目标类型与之一致。只有当错误类型小到像 `type Code int` 这种值语义时，值接收者才更自然。

## 包装与判定

用 `%w` 而不是 `%v` 来包装，错误链才能被追溯：

```go
package main

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
)

func readConfig(path string) ([]byte, error) {
	data, err := fs.ReadFile(os.DirFS("."), path)
	if err != nil {
		return nil, fmt.Errorf("读取配置 %s: %w", path, err)
	}
	return data, nil
}

func main() {
	_, err := readConfig("missing.yaml")
	if err != nil {
		fmt.Println(err) // 读取配置 missing.yaml: open missing.yaml: ...

		var pathErr *fs.PathError
		if errors.As(err, &pathErr) {
			fmt.Println("失败的路径:", pathErr.Path)
		}
	}
}
```

- `errors.Is(err, target)`：沿链比较哨兵，链上任意一层等于 target 就为 true。
- `errors.As(err, &target)`：沿链寻找能赋给 target 的具体类型，并取出它。
- `errors.Join(errs...)`（1.20）：把多个错误合成一个，`Is`/`As` 会遍历全部子错误。

```go
func validate(name string, age int) error {
	var errs []error
	if name == "" {
		errs = append(errs, errors.New("名字不能为空"))
	}
	if age < 0 {
		errs = append(errs, errors.New("年龄不能为负"))
	}
	return errors.Join(errs...) // 全为空时返回 nil
}
```

::: warning 不要比较错误字符串
`err.Error() == "not found"` 会在任何一次文案调整后静默失效。判断一律走 `errors.Is`。
:::

## panic 与 recover

`panic` 表示**程序状态已经不可信**，继续跑下去只会更糟：数组越界、除零、断言失败由运行时触发；自己主动调用应当极其克制。常规失败用 error 返回，不用 panic。

`recover` 只在 `defer` 的函数里调用才有效，典型场景是**库的边界**——把内部崩溃挡在进程外：

```go
func recoverMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if v := recover(); v != nil {
				log.Printf("panic: %v\n%s", v, debug.Stack())
				http.Error(w, "internal server error", http.StatusInternalServerError)
			}
		}()
		next.ServeHTTP(w, r)
	})
}
```

解析不可信输入时，把 panic 转成 error 也是一种边界处理：

```go
func parseCount(v any) (n int, err error) {
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("解析失败: %v", r)
		}
	}()
	// JSON 里的数字是 float64,这里断言 int 会 panic
	return v.(map[string]any)["count"].(int), nil
}
```

::: danger defer 不会执行的两种退出
`log.Fatal` / `log.Fatalf` 内部调用 `os.Exit(1)`，而 `os.Exit` **不会运行任何 defer**——文件不关、锁不释放、缓冲不刷。它只应出现在 `main` 的最外层，库代码里永远不要调用。
:::

## 反模式清单

- `_ = f()`：丢弃错误必须有理由（比如 `Close` 的二次错误），否则就是隐藏失败。
- `return err` 一路裸传：调用方看到的是"no such file"，不知道是读配置还是读日志。每层加上下文：`fmt.Errorf("读取配置: %w", err)`。
- 字符串比较错误：见上文的 warning。
- 把 error 当异常抛：层层包装到顶层才 `return` 一次，等于把 Go 的错误处理退回 try/catch，调用方失去了在合适层级补救的机会。

## 小结

- 实现是隐式的，方法集对上即可；接口定义在使用方，保持小。
- 接口值 = 动态类型 + 值，「装着 nil 指针的接口」不等于 nil。
- `error` 是接口；哨兵错误配 `errors.Is`，`%w` 配 `errors.As`，多个错误用 `errors.Join`。
- `panic`/`recover` 只用于状态不可信和库边界，`os.Exit` 不执行 defer。
- 错误要么立刻处理，要么带上下文返回，不要裸传、不要比字符串。

下一篇：[并发：Goroutine、Channel 与 sync](/post/go-guide/go-05-concurrency)。