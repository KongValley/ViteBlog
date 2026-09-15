<script setup>
import { site } from '../data/site'
</script>

<template>
  <section class="about">
    <h1 class="section-title">关于本站</h1>
    <div class="about-body">
      <p>
        你好,我是 {{ site.author }} 👋 这里是我的个人博客,用来记录前端学习笔记、
        开发中踩过的坑,以及一些有趣的东西。
      </p>
      <p>
        本站使用 <strong>Vue 3 + Vite</strong> 搭建,文章以 Markdown 编写,
        托管在 GitHub Pages 上,通过 GitHub Actions 自动构建部署 ——
        每次 push 到 main 分支,几分钟内线上就会更新。
      </p>
      <h2>如何联系我</h2>
      <ul>
        <li>
          GitHub:
          <a :href="site.github" target="_blank" rel="noopener">{{ site.github }}</a>
        </li>
      </ul>
      <p class="about-note">
        这段内容在 <code>src/views/AboutView.vue</code>,改成你自己的介绍吧。
      </p>
    </div>
  </section>
</template>
