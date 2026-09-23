---
title: Go 入门（二）：变量、常量与基础类型
date: 2026-09-23 10:00:00
cover: /ViteBlog/images/covers/go-guide__go-02-basic-types.jpg
tags:
  - Go
  - 入门
  - 基础语法
  - 切片
categories:
  - Go
excerpt: 变量与零值、常量与 iota、基础类型与显式转换、UTF-8 字符串、数组与切片、map、控制流，最后补上指针入门——Go 语法的地基一次铺完。
---

上一篇：[环境搭建与第一个程序](/post/go-guide/go-01-getting-started)。

这一篇铺地基：变量怎么声明、零值为什么能消掉一整类错误、切片和 map 的边界在哪、循环变量的语义在 Go 1.22 改了什么。语法不多，但每条都有对应的"踩坑姿势"，一次讲清楚。

## 变量声明

`var` 是声明，`:=` 是短变量声明。前者能用在包级和函数内，后者**只能在函数内**：

```go
package main

import "fmt"

var version = "1.22" // 包级变量,可以带初值

var (
	name  string // 带类型,取零值 ""
	count int    // 带类型,取零值 0
)

func main() {
	var msg string = "hi" // 带类型 + 带初值
	var n = 42            // 类型推导为 int
	sum := n + 1          // := 声明并赋值
	msg, sum = "bye", 7   // 已有变量用 =,不是 :=
	fmt.Println(version, name, count, msg, sum)
}
```

`:=` 的硬性规则：**左侧至少要有一个新变量**，否则编译报错。所以 `msg := "x"` 在 `msg` 已存在时是错误，而 `msg, err := f()` 合法——`err` 是新的。

包级变量与函数内变量的差别有两处：包级变量没有 `:=` 形式；函数内声明的变量出了作用域就不可见，包级变量则整个包都能访问（首字母大写还会导出给其他包）。

## 零值：Go 没有 undefined

Go 里**不存在未初始化的变量**。每种类型都有确定的零值：

| 类型 | 零值 |
| --- | --- |
| 数值（`int`、`float64`…） | `0` |
| `string` | `""` |
| `bool` | `false` |
| 指针、切片、map、channel、函数、接口 | `nil` |
| struct | 各字段各自取零值 |

对照一下：JS 里 `let x; x + 1` 得到 `NaN`，Python 里读未赋值的名字直接 `NameError`，Go 把这类问题整个消掉了——`var n int` 就是可用的 `0`。

但 `nil` 不等于"随便用"，切片和 map 的边界不一样：

```go
var s []string
fmt.Println(len(s), s == nil) // 0 true:空切片,可读可追加
s = append(s, "x")            // 没问题,nil 切片也能 append
for _, v := range s {
	fmt.Println(v) // 空切片遍历零次,不报错
}

var m map[string]int
fmt.Println(m["a"]) // 0:读 nil map 返回零值
m["a"] = 1          // panic: assignment to entry in nil map
```

结论：`nil` 切片可以直接用，`nil` map 只能读不能写，要写必须先 `make(map[string]int)`。

## 常量与 iota

`const` 声明的值必须在编译期确定，且**无类型常量是任意精度**的：整数运算全程精确，只在真正赋给某个类型时才检查是否放得下。

```go
const Big = 1 << 60 // 无类型整数常量
const Sum = Big + 1 // 精确等于 2^60 + 1

fmt.Println(Sum - Big)                       // 1:整数常量运算不丢精度
fmt.Println(float64(Big) + 1 - float64(Big)) // 0:转成 float64 就丢了

const Huge = 1 << 100  // 精确到 2^100,float64 的尾数根本装不下
const Back = Huge >> 99 // 2,中间过程依然精确
fmt.Println(Back)       // 2

// var i int = Huge       // ❌ 编译错误:constant 2^100 overflows int
// var f float64 = 1e1000 // ❌ 编译错误:constant 1e1000 overflows float64
```

`float64` 只有 53 位尾数，`2^60 + 1` 这种值它表示不出来；而无类型常量可以一路精确算到赋值那一刻，这在大整数运算、单位换算里很实用。

`iota` 用来做枚举，从 0 开始、每行自增：

```go
type Weekday int

const (
	Sunday Weekday = iota // 0
	Monday                // 1
	Tuesday               // 2
)

func (d Weekday) String() string {
	return [...]string{"Sunday", "Monday", "Tuesday"}[d]
}

func main() {
	fmt.Println(Tuesday)        // Tuesday:fmt 会自动调用 String()
	fmt.Printf("%v %d\n", Monday, Monday) // Monday 1
}
```

> 注意 `iota` 是**行号计数器**，不是"值+1"。中间插入一行普通声明，后面的值会跟着变；需要跳值时用 `_ = iota` 占位。

## 基础类型

| 类型 | 说明 | 零值 |
| --- | --- | --- |
| `int` | 平台相关，64 位平台上是 64 位 | `0` |
| `int8/int16/int32/int64` | 有符号，位宽固定 | `0` |
| `uint`、`uint8/16/32/64` | 无符号，同上 | `0` |
| `uintptr` | 能装下指针的整数，给 `unsafe` 用 | `0` |
| `float32` / `float64` | IEEE 754，浮点字面量默认 `float64` | `0` |
| `bool` | | `false` |
| `string` | 不可变字节序列 | `""` |
| `byte` | `uint8` 的别名 | `0` |
| `rune` | `int32` 的别名，表示一个 Unicode 码点 | `0` |

`int` 的宽度跟着平台走，写序列化、二进制协议或哈希时不要用它，一律用 `int32`/`int64` 这种固定宽度类型。

**类型转换必须显式**，没有隐式提升：

```go
var n int = 42
var f float64 = float64(n) // 必须写出来
var i int = int(f)

// var bad float64 = n // ❌ 编译错误:不能把 int 赋给 float64
```

`string(int)` 是个经典坑：它把整数当成 Unicode 码点，得到的是**字符**而不是数字字符串。

```go
fmt.Println(string(65))       // A
fmt.Println(string(rune(65))) // A:显式写明意图,可读性更好
fmt.Println(strconv.Itoa(65)) // "65":想要数字字符串用这个
```

## 字符串与 UTF-8

Go 的 `string` 是**不可变的字节序列**，通常按 UTF-8 编码存放。所以长度有两个口径：

```go
s := "你好,Go"
fmt.Println(len(s))                    // 9:字节数
fmt.Println(utf8.RuneCountInString(s)) // 5:字符数
```

按字节下标取 `s[0]` 会拿到半个汉字。要按字符处理就用 `range`，它每次迭代解出一个 rune，并给出该 rune 的**起始字节下标**：

```go
for i, r := range s {
	fmt.Printf("%d:%c ", i, r)
}
// 0:你 3:好 6:, 7:G 8:o
```

拼接字符串不要用 `+` 堆在循环里（每次都产生新字符串），用 `strings.Builder` 或 `strings.Join`：

```go
var b strings.Builder
for i := range 3 {
	fmt.Fprintf(&b, "item-%d;", i)
}
fmt.Println(b.String()) // item-0;item-1;item-2;

fmt.Println(strings.Join([]string{"a", "b", "c"}, "-")) // a-b-c
```

日常够用的几个：`strings.Contains`、`strings.HasPrefix`、`strings.TrimSpace`、`strings.Split`、`strings.ReplaceAll`、`strings.ToUpper`、`strings.Cut`（一步切出前后两段，比 `Split` 安全）。

## 数组与切片

数组长度是类型的一部分，而且是**值类型**——赋值会整份复制：

```go
a := [3]int{1, 2, 3}
b := a
b[0] = 100
fmt.Println(a, b) // [1 2 3] [100 2 3]:a 没被改动
```

切片是**数组的一段视图**，底层共享同一个数组，`len` 是当前长度，`cap` 是从起点到底层数组末尾的容量：

```go
base := []int{1, 2, 3, 4, 5}
s := base[1:3]        // len=2 cap=4
fmt.Println(len(s), cap(s)) // 2 4
s = append(s, 99)     // cap 够用,直接写进 base[3]
fmt.Println(base)     // [1 2 3 99 5]:base 被改了
```

`append` 在容量不足时会分配新数组并复制，此后两者不再共享；容量够时就地写入。这就是"切片共享底层数组"的经典坑——看一段更容易看清的：

```go
s := make([]int, 0, 2)
s = append(s, 1, 2)
alias := s          // 同一个底层数组
s = append(s, 3)    // 超出 cap,分配新数组
alias[0] = 100
fmt.Println(s, alias) // [1 2 3] [100 2]
```

`alias[0] = 100` 改的是旧数组，新数组里的 `s[0]` 还是 1。要切断共享关系，用 `copy`：

```go
dst := make([]int, len(src))
n := copy(dst, src) // 返回复制的元素个数
```

三索引切片 `s[a:b:c]` 把容量也限制住，`cap` 变成 `c-a`，这样后续 `append` 必然另起数组，不会再影响原数组：

```go
base := []int{1, 2, 3, 4, 5}
s := base[1:3:3]     // len=2 cap=2
s = append(s, 99)    // cap 已满,分配新数组
fmt.Println(base)    // [1 2 3 4 5]:base 完好
```

> 给外部返回切片时，如果调用方可能 `append`，三索引或先 `copy` 一份，能避免"莫名其妙改了别人的数据"。

## map

map 是哈希表，键必须可比较（切片、map、函数不能做键）：

```go
m := map[string]int{"a": 1, "b": 2}
m["c"] = 3

v, ok := m["a"] // comma-ok:第二个返回值表示键是否存在
if ok {
	fmt.Println("a =", v)
}

delete(m, "c")
fmt.Println(len(m)) // 2

for k, v := range m { // 遍历顺序随机,不要依赖它
	fmt.Println(k, v)
}
```

几个必须记住的点：

- **遍历顺序随机**,Go 故意这么做，防止代码依赖顺序。要稳定输出先把键排出来 `sort.Strings(keys)`。
- **map 元素不可取地址**，`&m["a"]` 编译报错——元素可能因扩容搬家。需要地址就存指针，或者先取到局部变量。
- **map 不是并发安全的**，多 goroutine 同时读写会直接 fatal。要加锁，或用 `sync.Map`；这部分留给第五篇展开。

## 控制流

`if` 可以带初始化语句，变量作用域只在这个 `if` 里，刚好配合 comma-ok：

```go
if v, ok := m["a"]; ok {
	fmt.Println(v)
} else {
	fmt.Println("缺失")
}
```

`for` 是 Go 里唯一的循环关键字，三种形态加一个 Go 1.22 的新写法：

```go
for i := 0; i < 3; i++ { // 三段式
}
for i < 10 { // 只留条件,相当于 while
	i++
}
for { // 无限循环
	break
}
for i := range 10 { // Go 1.22:range over int,等价于 i := 0; i < 10; i++
	fmt.Println(i)
}
```

`switch` **自带 break**，不会贯穿；要贯穿得显式写 `fallthrough`；`case` 支持逗号列多个值。不带表达式的 `switch` 就是更整齐的 if-else 链：

```go
switch {
case n < 0:
	fmt.Println("负数")
case n == 0:
	fmt.Println("零")
default:
	fmt.Println("正数")
}
```

最后是 Go 1.22 的一处语义修正：**`range` 的循环变量每轮迭代都是新变量**。以前所有迭代共用同一个变量，闭包或 goroutine 里引用它会全拿到最后一个值：

```go
func main() {
	funcs := make([]func(), 0, 3)
	for i := range 3 {
		funcs = append(funcs, func() { fmt.Print(i) })
	}
	for _, f := range funcs {
		f()
	}
	fmt.Println() // Go 1.22+:012;更早版本是 333
}
```

> 升级到 Go 1.22 后，旧代码里为了绕过这个问题写的 `i := i` 已经多余，可以直接删掉。

## 指针入门

`&` 取地址得到指针，`*` 解引用拿到值：

```go
n := 42
p := &n  // *int
*p = 7   // 通过指针改值
fmt.Println(n) // 7
```

**Go 的函数传参永远是值传递**，传进去的是副本。想改到调用方的变量，就得传指针：

```go
func inc(n int)  { n++ }  // 改的是副本,外面看不到
func incP(n *int) { *n++ } // 改的是调用方的变量

func main() {
	n := 1
	inc(n)
	fmt.Println(n) // 1
	incP(&n)
	fmt.Println(n) // 2
}
```

`new(T)` 分配一个 T 并返回 `*T`，指向零值；结构体更常用取地址的复合字面量：

```go
type Point struct{ X, Y int }

p := &Point{X: 1, Y: 2} // 最常用
q := new(Point)         // 等价于 &Point{},零值 {0 0}
p.X = 3                 // 自动解引用,不用写 (*p).X
fmt.Println(*p, *q)     // {3 2} {0 0}
```

什么时候该用指针：

- **大结构体**作为参数或返回值，避免整份复制
- **需要修改**调用方的值，或维护共享状态
- **表示可选**：`nil` 就是"没有"，比加一个 `valid bool` 字段干净

反过来，小类型（`int`、小 struct）、只读的输入，直接用值就行——过早引入指针只会让代码更难读，也给 GC 添活。

## 小结

- 每种类型都有零值，`nil` 切片可读可追加，`nil` map 只能读
- 无类型常量精度不受限，`iota` 从 0 开始按行自增
- 类型转换必须显式；要数字字符串用 `strconv.Itoa`，别用 `string(int)`
- 切片是共享底层数组的视图，`append` 是否分配新数组取决于 `cap`，三索引切片可切断共享
- 传参永远是值传递，要改调用方的值就传指针
- Go 1.22 起 `range` 每轮迭代新建循环变量，`for i := range 10` 可以直接循环整数

下一篇：[函数、方法与结构体](/post/go-guide/go-03-functions-structs)。