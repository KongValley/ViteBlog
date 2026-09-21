---
title: Python 入门（二）：变量、集合与流程控制
date: 2026-09-16
cover: /ViteBlog/images/covers/python-basic-syntax.jpg
tags:
  - Python
  - 入门
  - 基础语法
categories:
  - Python
excerpt: 用一个成绩统计示例理解变量、数字、字符串、列表、字典、条件判断和循环，打好 Python 基础语法地基。
---

## 变量不需要声明类型

Python 的变量更像给值贴标签。你不需要写 `int age`，直接赋值即可：

```python
name = "小明"
age = 15
height = 1.72
is_student = True
```

这里同时出现了几种基础类型：

| 类型 | 示例 | 说明 |
| --- | --- | --- |
| `str` | `"小明"` | 字符串 |
| `int` | `15` | 整数 |
| `float` | `1.72` | 浮点数 |
| `bool` | `True` | 布尔值，只有 `True` 和 `False` |
| `NoneType` | `None` | 表示“没有值” |

可以用 `type()` 查看类型：

```python
print(type(name))       # <class 'str'>
print(type(age))        # <class 'int'>
print(type(height))     # <class 'float'>
print(type(is_student)) # <class 'bool'>
```

## 字符串和格式化

字符串可以用单引号或双引号：

```python
city = "上海"
fruit = '苹果'
```

拼接字符串时优先使用 f-string：

```python
name = "小明"
score = 92
print(f"{name} 的分数是 {score}")
```

输出：

```text
小明的分数是 92
```

f-string 还能做简单格式化：

```python
price = 12.5
count = 3
print(f"总价：{price * count:.2f} 元")
```

`:.2f` 表示保留两位小数。

## 列表：一组有序的数据

列表用方括号表示：

```python
scores = [88, 92, 75, 100, 63]
print(scores[0])    # 88
print(scores[-1])   # 100
print(len(scores))  # 5
```

列表可以修改：

```python
scores.append(90)       # 添加到末尾
scores[2] = 80          # 修改第 3 项
scores.remove(63)       # 删除指定值
print(scores)
```

常见方法：

```python
scores.sort()          # 从小到大排序
scores.reverse()       # 反转
scores.insert(0, 70)   # 在索引 0 前插入
```

## 字典：用键保存值

字典用大括号表示，每一项都是“键: 值”：

```python
student = {
    "name": "小明",
    "age": 15,
    "scores": [88, 92, 75],
}

print(student["name"])
print(student["scores"])
```

读取不存在的键会报错，可以用 `get()` 提供默认值：

```python
print(student.get("email", "未填写"))
```

添加和修改都很直观：

```python
student["email"] = "xiaoming@example.com"
student["age"] = 16
```

## 元组和集合

元组像列表，但创建后不能修改，适合表示固定结构：

```python
point = (120, 80)
x, y = point
```

集合会自动去重，适合判断“是否存在”：

```python
tags = {"python", "blog", "python", "notes"}
print(tags)
print("python" in tags)
```

## 条件判断

Python 使用 `if`、`elif`、`else`：

```python
score = 88

if score >= 90:
    print("优秀")
elif score >= 80:
    print("良好")
elif score >= 60:
    print("及格")
else:
    print("继续加油")
```

注意两点：

1. 冒号 `:` 不能少；
2. 代码块用缩进表示。

常用比较和逻辑运算：

```python
age = 20
has_id = True

if age >= 18 and has_id:
    print("可以进入")

if score < 60 or score == 59:
    print("需要补考")
```

## 循环

遍历列表：

```python
scores = [88, 92, 75, 100]

for score in scores:
    print(score)
```

需要索引时使用 `enumerate()`：

```python
for index, score in enumerate(scores, start=1):
    print(f"第 {index} 个成绩：{score}")
```

生成数字序列：

```python
for number in range(1, 6):
    print(number)
```

输出 1 到 5。

## 一个小例子：统计成绩

把上面的知识组合起来：

```python
scores = [88, 92, 75, 100, 63, 89]

total = 0
highest = scores[0]
lowest = scores[0]

for score in scores:
    total += score

    if score > highest:
        highest = score

    if score < lowest:
        lowest = score

average = total / len(scores)

print(f"平均分：{average:.2f}")
print(f"最高分：{highest}")
print(f"最低分：{lowest}")
```

输出：

```text
平均分：84.50
最高分：100
最低分：63
```

这个例子不需要任何第三方库，也适合作为你的第一个练习。

## 练习建议

1. 创建一个列表，保存 5 个商品价格，计算总价和平均值；
2. 创建一个字典，保存书名、作者、价格，并逐项打印；
3. 写一个程序，输入一个分数，输出等级；
4. 用 `for` 循环打印九九乘法表。

语法只是工具。写完这些小练习后，你会发现 Python 的基础结构已经开始变得自然。
