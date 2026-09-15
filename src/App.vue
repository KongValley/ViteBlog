<script setup>
import { ref } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { site } from './data/site'

// 主题:初始取本地保存的偏好,否则跟随系统
const initial =
  localStorage.getItem('theme') ??
  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
const theme = ref(initial)
document.documentElement.dataset.theme = theme.value

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  document.documentElement.dataset.theme = theme.value
  localStorage.setItem('theme', theme.value)
}
</script>

<template>
  <div class="page">
    <header class="header">
      <div class="container header-inner">
        <RouterLink to="/" class="brand">
          {{ site.name }}<span class="brand-dot">.</span>
        </RouterLink>
        <nav class="nav">
          <RouterLink to="/" class="nav-link">首页</RouterLink>
          <RouterLink to="/about" class="nav-link">关于</RouterLink>
          <button
            class="theme-toggle"
            :title="theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'"
            @click="toggleTheme"
          >
            {{ theme === 'dark' ? '☀️' : '🌙' }}
          </button>
        </nav>
      </div>
    </header>

    <main class="main">
      <div class="container">
        <RouterView />
      </div>
    </main>

    <footer class="footer">
      <div class="container">
        <p>© {{ site.since }} {{ site.author }} · {{ site.tagline }}</p>
        <p class="footer-meta">
          由 <a :href="site.github" target="_blank" rel="noopener">GitHub</a> Pages
          强力驱动 · Vue 3 + Vite
        </p>
      </div>
    </footer>
  </div>
</template>
