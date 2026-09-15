<script setup>
import { computed, ref } from 'vue'
import { posts } from '../data/posts'
import { site } from '../data/site'
import PlayerCard from '../components/PlayerCard.vue'

const activeTag = ref('')

const allTags = computed(() => [...new Set(posts.flatMap((p) => p.tags))])
const filteredPosts = computed(() =>
  activeTag.value ? posts.filter((p) => p.tags.includes(activeTag.value)) : posts,
)

function formatDate(date) {
  if (!date) return ''
  const [y, m, d] = date.split('-')
  return `${y} 年 ${Number(m)} 月 ${Number(d)} 日`
}
</script>

<template>
  <div class="home-layout">
    <PlayerCard />

    <div class="home-main">
      <section class="hero">
        <h1 class="hero-title">{{ site.name }}</h1>
        <p class="hero-tagline">{{ site.tagline }} — 基于 Vue 3 + Vite 构建</p>
        <p class="hero-press pixel-en blink">★ PRESS START TO READ ★</p>
      </section>

      <div v-if="allTags.length" class="tag-filter">
        <button
          class="tag"
          :class="{ 'tag-active': activeTag === '' }"
          @click="activeTag = ''"
        >
          全部 ({{ posts.length }})
        </button>
        <button
          v-for="tag in allTags"
          :key="tag"
          class="tag"
          :class="{ 'tag-active': activeTag === tag }"
          @click="activeTag = activeTag === tag ? '' : tag"
        >
          {{ tag }}
        </button>
      </div>

      <section class="post-list">
        <article v-for="post in filteredPosts" :key="post.slug" class="post-card">
          <RouterLink :to="`/post/${post.slug}`" class="post-card-link">
            <h2 class="post-card-title">{{ post.title }}</h2>
            <p class="post-card-excerpt">{{ post.excerpt }}</p>
            <div class="post-card-meta">
              <time class="post-card-date">{{ formatDate(post.date) }}</time>
              <span v-for="tag in post.tags" :key="tag" class="tag tag-small">
                {{ tag }}
              </span>
            </div>
          </RouterLink>
        </article>

        <p v-if="!filteredPosts.length" class="empty">这个标签下还没有文章~</p>
      </section>
    </div>
  </div>
</template>
