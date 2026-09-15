---
title: Vue 3 组合式 API 入门笔记
date: 2026-09-14
tags: Vue
excerpt: ref、computed、watch 三件套的使用心得,以及组合式 API 相比选项式 API 到底解决了什么问题。
---

刚接触 Vue 3 时最容易困惑的就是:为什么有了 `data`、`computed` 还要搞一套 `ref`、`computed`、`watch`?这篇笔记记录我的理解。

## 组合式 API 解决了什么问题?

选项式 API(data / methods / computed 分开写)在组件变大后,同一个功能的代码会被拆散到各个选项里,跳来跳去很难维护。组合式 API 允许**按功能组织代码** —— 相关的响应式数据、计算属性、副作用写在一起,还能抽成可复用的函数(组合式函数)。

## 三件套

### ref:响应式数据

```js
import { ref } from 'vue'

const count = ref(0)
count.value++ // js 里要通过 .value 访问
// 模板里直接用 {{ count }},不需要 .value
```

记住一条规则:**在 `<script>` 里用 `.value`,在模板里不用**。

### computed:计算属性

```js
import { ref, computed } from 'vue'

const posts = ref([...])
const published = computed(() => posts.value.filter(p => p.published))
```

`computed` 会自动追踪依赖并缓存结果,依赖不变就不会重新计算。

### watch:侦听器

```js
import { ref, watch } from 'vue'

const keyword = ref('')
watch(keyword, (newVal, oldVal) => {
  console.log(`搜索词从 ${oldVal} 变成了 ${newVal}`)
})
```

## 一个真实例子

本博客首页的标签过滤就是三件套的典型组合:

```js
const activeTag = ref('')                        // ref:当前选中的标签

const allTags = computed(() =>
  [...new Set(posts.flatMap(p => p.tags))]       // computed:所有标签去重
)

const filteredPosts = computed(() =>
  activeTag.value
    ? posts.filter(p => p.tags.includes(activeTag.value))
    : posts                                       // computed:根据选中标签过滤
)
```

没有手动操作 DOM,没有手动刷新列表 —— 数据变了,视图自动跟上。这就是响应式编程的核心体验。

## 小结

- `ref` 管数据,`computed` 管派生,`watch` 管副作用
- 能用 `computed` 就别用 `watch` + 手动同步
- 逻辑按功能聚合,复杂逻辑抽成 `useXxx` 组合式函数
