<script setup>
import { computed } from 'vue'
import { marked } from 'marked'
import { useRoute } from 'vue-router'
import { adjacentPosts, getPostBySlug } from '../data/posts'

const route = useRoute()
const post = computed(() => getPostBySlug(route.params.slug))
const html = computed(() => (post.value ? marked.parse(post.value.content) : ''))
const { prev, next } = adjacentPosts(route.params.slug)

function formatDate(date) {
  if (!date) return ''
  const [y, m, d] = date.split('-')
  return `${y} 年 ${Number(m)} 月 ${Number(d)} 日`
}
</script>

<template>
  <article v-if="post" class="post">
    <header class="post-header">
      <h1 class="post-title">{{ post.title }}</h1>
      <div class="post-meta">
        <time>{{ formatDate(post.date) }}</time>
        <span v-for="tag in post.tags" :key="tag" class="tag tag-small">
          {{ tag }}
        </span>
      </div>
    </header>

    <!-- eslint-disable-next-line vue/no-v-html — 内容是仓库内自己写的 Markdown,来源可控 -->
    <div class="post-content markdown-body" v-html="html"></div>

    <nav class="post-adjacent">
      <RouterLink v-if="next" :to="`/post/${next.slug}`" class="adjacent-link">
        <span class="adjacent-label">← 较新一篇</span>
        <span class="adjacent-title">{{ next.title }}</span>
      </RouterLink>
      <span v-else></span>
      <RouterLink v-if="prev" :to="`/post/${prev.slug}`" class="adjacent-link adjacent-right">
        <span class="adjacent-label">较早一篇 →</span>
        <span class="adjacent-title">{{ prev.title }}</span>
      </RouterLink>
    </nav>
  </article>

  <section v-else class="empty-block">
    <p class="game-over pixel-en blink">GAME OVER</p>
    <p class="empty">文章不存在,可能已被删除或链接有误。</p>
    <RouterLink to="/" class="back-home">← 返回首页</RouterLink>
  </section>
</template>
