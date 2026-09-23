---
title: Go 精通（六）：泛型与标准库实战
date: 2026-09-23 14:00:00
cover: /ViteBlog/images/covers/go-guide__go-06-generics-stdlib.jpg
tags:
  - Go
  - 精通
  - 泛型
  - 标准库
categories:
  - Go
excerpt: 从 any + 类型断言讲到类型参数、约束与泛型类型，再用 net/http、encoding/json、log/slog 写一个可运行的 JSON API，最后梳理常用标准库与 reflect/unsafe 的边界。
---

上一篇：[并发：Goroutine、Channel 与 sync](/post/go-guide/go-05-concurrency)。并发解决"同时做很多事"，这一篇解决"同一件事对很多类型都成立"。Go 1.18 引入类型参数，1.21 补齐 `cmp`/`slices`/`maps` 这些泛型工具包。

## 泛型之前：any + 类型断言

没有类型参数时，"求所有元素之和"只能靠 `any` 加运行时断言：

```go
func SumAny(values []any) (float64, error) {
	var total float64
	for _, v := range values {
		switch n := v.(type) {
		case int:
			total += float64(n)
		case float64:
			total += n
		default:
			return 0, fmt.Errorf("不支持的类型 %T", v)
		}
	}
	return total, nil
}
```

问题有三层：传什么都能编译通过，错误推迟到运行时；每加一种类型就要改 `switch`；`[]int` 还得先转成 `[]any`。类型参数把这些挪回编译期。

## 类型参数入门

把元素类型抽成参数，最经典的两个组合子：

```go
func Map[T, U any](s []T, f func(T) U) []U {
	out := make([]U, len(s))
	for i, v := range s {
		out[i] = f(v)
	}
	return out
}

func Filter[T any](s []T, keep func(T) bool) []T {
	out := make([]T, 0, len(s))
	for _, v := range s {
		if keep(v) {
			out = append(out, v)
		}
	}
	return out
}
```

调用时类型通常能推断，不用显式写方括号：

```go
type User struct {
	Name string
	Age  int
}

users := []User{{"ada", 36}, {"bob", 17}}

names := Map(users, func(u User) string { return u.Name }) // []string
adults := Filter(users, func(u User) bool { return u.Age >= 18 })
```

推断失败时编译器会直接报错，这时才需要显式实例化，典型场景是**参数里完全没出现某个类型参数**：比如 `f` 传 `nil` 时，只能写 `Map[string, int]` 这种显式形式。显式写 `[T]` 是少数派，出现即说明设计可能有问题。

> 类型参数写成 `[T any]` 而不是 `<T>`；`any` 是 `interface{}` 的别名。

## 约束：interface 的新用法

`any` 允许任何类型，但很多算法需要"能比较""能相加"。约束就是接口，只是可以写在类型参数位置上。

**联合类型**限定允许的类型：

```go
type Number interface {
	int | int64 | float64
}

func Sum[T Number](nums []T) T {
	var total T
	for _, n := range nums {
		total += n
	}
	return total
}
```

**`~` 近似类型**：`int | float64` 这类字面量只匹配"恰好是 int"的类型，给 `float64` 起了名字就不行了：

```go
type Celsius float64

type Temperature interface {
	~float64 // 底层类型是 float64 的都算，包含 Celsius
}

func Max[T Temperature](a, b T) T {
	if a > b {
		return a
	}
	return b
}
```

`~T` 读作"底层类型是 T"。自定义数值、字符串类型遍地都是（`type UserID int64`），约束里基本都该带 `~`。

**`comparable`** 是语言内置约束，表示支持 `==`/`!=`，做查找、去重、map 键必须用它：

```go
func Index[T comparable](s []T, target T) int {
	for i, v := range s {
		if v == target {
			return i
		}
	}
	return -1
}
```

数值、字符串、指针都满足 `comparable`；切片和 map 不可比较，拿它们当类型参数会编译失败。

**`cmp.Ordered`**（Go 1.21）覆盖所有有序类型，比手写联合类型省事：

```go
import "cmp"

func Clamp[T cmp.Ordered](v, lo, hi T) T { return min(max(v, lo), hi) }
```

早期社区用 `golang.org/x/exp/constraints` 补这块能力，Go 1.21 把等价约束收进标准库后该包已废弃，直接用 `cmp`、`slices`、`maps`。

## 泛型类型

约束也能用在类型声明上，`Set` 替代了手写的 `map[string]struct{}`：

```go
type Set[T comparable] map[T]struct{}

func (s Set[T]) Add(v T)      { s[v] = struct{}{} }
func (s Set[T]) Has(v T) bool { _, ok := s[v]; return ok }
func (s Set[T]) Delete(v T)   { delete(s, v) }

// 用法
s := Set[string]{}
s.Add("go")
fmt.Println(s.Has("go")) // true
```

再写一个带状态的泛型结构体，注意 `Pop` 的空栈返回值：

```go
type Stack[T any] struct{ items []T }

func (s *Stack[T]) Push(v T) { s.items = append(s.items, v) }

func (s *Stack[T]) Pop() (T, bool) {
	var zero T // 泛型里没有 nil 可用，取零值只能这么写
	if len(s.items) == 0 {
		return zero, false
	}
	v := s.items[len(s.items)-1]
	s.items = s.items[:len(s.items)-1]
	return v, true
}
```

> `type Result[T any] struct { Value T; Err error }` 这类"泛型容器"在库代码里很常见，业务层用具体类型更直观。方法**不能**自己带类型参数（写成 `func (s Set[T]) Map[U any]` 是语法错误），需要新类型参数时改用包级函数。

## 什么时候不该用泛型

泛型是工具不是目标，下面几种情况写具体类型更清楚：

- **只用一次**：抽象至少要两处复用才划算，`ParseUser(v any) (User, error)` 比泛型版更好读。
- **类型之间行为差异大**：如果函数体里对每个类型都要 `switch`，你要的是**接口**（`io.Reader`、`fmt.Stringer` 那种带行为的抽象）。泛型擅长"算法与类型无关"，接口擅长"行为多态"。
- **方法需要自己的类型参数**：语言不支持，用接口或包级函数绕开。
- **只想省几行复制**：`slices`、`maps` 已经写好通用逻辑，优先用标准库。

判断标准：**逻辑对类型无感时用泛型，行为随类型变化时用接口。**

## 标准库实战：一个 JSON API

程序完整可运行，只用标准库：Go 1.22 的 `http.ServeMux` 路由模式、`encoding/json`、`log/slog`，加一把 `sync.Mutex`。

```go
package main

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"sync"
)

type Todo struct {
	ID    int    `json:"id"`
	Title string `json:"title"`
	Done  bool   `json:"done"`
}

type Store struct {
	mu     sync.Mutex
	nextID int
	todos  map[int]Todo
}

func NewStore() *Store {
	return &Store{nextID: 1, todos: map[int]Todo{}}
}

func (s *Store) Add(title string) Todo {
	s.mu.Lock()
	defer s.mu.Unlock()
	t := Todo{ID: s.nextID, Title: title}
	s.nextID++
	s.todos[t.ID] = t
	return t
}

func (s *Store) List() []Todo {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]Todo, 0, len(s.todos))
	for _, t := range s.todos {
		out = append(out, t)
	}
	return out
}

func (s *Store) Get(id int) (Todo, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	t, ok := s.todos[id]
	return t, ok
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Error("写响应失败", "err", err)
	}
}

func fail(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func handleGet(store *Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := strconv.Atoi(r.PathValue("id"))
		if err != nil {
			fail(w, http.StatusBadRequest, "id 必须是整数")
			return
		}
		todo, ok := store.Get(id)
		if !ok {
			fail(w, http.StatusNotFound, "todo 不存在")
			return
		}
		writeJSON(w, http.StatusOK, todo)
	}
}

func handleCreate(store *Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Title string `json:"title"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			fail(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		if body.Title == "" {
			fail(w, http.StatusBadRequest, "title 不能为空")
			return
		}
		writeJSON(w, http.StatusCreated, store.Add(body.Title))
	}
}

func main() {
	store := NewStore()
	store.Add("读 Go 泛型")
	store.Add("写 JSON API")

	mux := http.NewServeMux()
	mux.HandleFunc("GET /todos", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, store.List())
	})
	mux.HandleFunc("GET /todos/{id}", handleGet(store))
	mux.HandleFunc("POST /todos", handleCreate(store))

	const addr = ":8080"
	slog.Info("服务启动", "addr", addr)
	if err := http.ListenAndServe(addr, mux); err != nil && !errors.Is(err, http.ErrServerClosed) {
		slog.Error("服务退出", "err", err)
		os.Exit(1)
	}
}
```

要点：

- `"GET /todos/{id}"` 是 1.22 起的方法+路径模式：方法不匹配自动返回 405，不用判断 `r.Method`；路径参数用 `r.PathValue("id")` 取。
- `{id}` 只匹配单个路径段，`/todos/1/extra` 不会命中；注册冲突的模式会在启动时 panic。

跑起来验证：

```bash
go run main.go
curl -s -X POST localhost:8080/todos -d '{"title":"部署"}'
curl -s localhost:8080/todos/1
```

## 其他常用标准库

| 包 | 常用函数 | 说明 |
| --- | --- | --- |
| `os` | `ReadFile` / `WriteFile` | 一次读完整文件，省掉手写 `Open`+`Close` |
| `io` | `Copy` / `Reader` | `io.Copy(dst, src)` 按流组合，屏蔽两边差异 |
| `time` | `Now` / `Duration` / `Since` | 用 `time.Now` + `time.Since` 计时，别用 `Unix()` 相减 |
| `strings` | `Cut` / `Split` / `Builder` | `Cut` 比 `SplitN`+`len` 检查直白 |
| `strconv` | `Atoi` / `ParseFloat` / `Itoa` | 字符串与数字互转 |
| `slices` | `Sort` / `Contains` / `Compact` | 泛型切片工具 |
| `maps` | `Clone` / `Keys` / `Values` | 泛型 map 工具 |
| `embed` | `//go:embed` | 把静态文件编进二进制 |
| `flag` | `String` / `Bool` / `Parse` | 命令行参数 |

文件读写与流组合：

```go
data, err := os.ReadFile("config.json")
if err != nil {
	return fmt.Errorf("读取配置: %w", err)
}
if err := os.WriteFile("out.json", data, 0o644); err != nil {
	return err
}

// 压缩、加密、网络都实现 io.Reader/Writer，可以串起来
var buf bytes.Buffer
if _, err := io.Copy(&buf, r.Body); err != nil {
	return err
}
```

`slices` 与 `maps` 是泛型最直接的落地：

```go
nums := []int{3, 1, 2, 2}
slices.Sort(nums)           // [1 2 2 3]
nums = slices.Compact(nums) // [1 2 3]，只去掉相邻重复，必须先排序

m := map[string]int{"a": 1}
m2 := maps.Clone(m) // 浅拷贝，改 m2 不影响 m
```

`embed` 把静态文件嵌进二进制，配合 1.22 的 `http.FileServerFS` 一行就能提供静态资源：

```go
import "embed"

//go:embed static/*
var staticFS embed.FS

mux.Handle("GET /static/", http.StripPrefix("/static/", http.FileServerFS(staticFS)))
```

`flag` 读命令行参数：

```go
addr := flag.String("addr", ":8080", "监听地址")
debug := flag.Bool("debug", false, "输出调试日志")
flag.Parse()
slog.Info("启动", "addr", *addr, "debug", *debug)
// go run main.go -addr :9090 -debug
```

## 反射与 unsafe 的边界

**`reflect`**：代价是运行时开销、丢掉编译期检查。判断标准——**只有当类型要到运行时才能确定，且这段逻辑会被大量复用**时才用，典型场景是框架代码：JSON 序列化、ORM 字段映射、测试断言库。业务代码里出现 `reflect.TypeOf` 基本都写错了。

**`unsafe`**：绕过类型系统直接操作内存，代价是可移植性、GC 安全与版本兼容性。判断标准——**先有压测数据证明这里是瓶颈，再写清注释说明没有别的办法**（如 `[]byte` 与 `string` 的零拷贝转换）。

## 小结

- 类型参数把"对类型无感"的算法变成编译期安全的复用，替代 `any` + 运行时断言
- 约束即接口：`~T` 匹配底层类型（自定义类型必需），`comparable` 管相等，`cmp.Ordered` 管大小
- 泛型类型（`Set[T comparable]`、`Stack[T any]`）把容器惯用法收进类型系统，但方法不能自带类型参数
- 复用不到两处、或行为随类型变化时别用泛型；`slices`/`maps`/`cmp` 已覆盖大部分集合操作
- `net/http` + `encoding/json` + `log/slog` 足以撑起一个服务；`reflect` 留给框架，`unsafe` 要有数据支撑

下一篇：[测试、性能与工程化](/post/go-guide/go-07-engineering)。