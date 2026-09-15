<script setup>
import { site } from '../data/site'

// 从 github 仓库链接里取出用户名,如 .../KongValley/ViteBlog → KongValley
const handle = site.github.split('/').filter(Boolean).pop()
</script>

<template>
  <aside class="player-card" aria-label="站长信息">
    <div class="gb-shell">
      <!-- 机身顶部:型号 + 电源灯 -->
      <div class="gb-top">
        <span class="gb-brand pixel-en">VITEBOY</span>
        <span class="gb-led" title="POWER"></span>
      </div>

      <!-- 屏幕区域:GitHub 头像做旧成像素颗粒 -->
      <div class="gb-bezel">
        <span class="gb-bezel-label pixel-en">PLAYER 1</span>
        <a
          class="gb-screen"
          :href="`https://github.com/${handle}`"
          target="_blank"
          rel="noopener"
          title="点击访问我的 GitHub 主页"
        >
          <img
            class="gb-avatar"
            :src="site.avatar"
            :alt="`${site.author} 的 GitHub 头像`"
            width="120"
            height="120"
            loading="eager"
          />
          <span class="gb-cursor pixel-en blink" aria-hidden="true">▶</span>
        </a>
      </div>

      <!-- 玩家信息 -->
      <div class="gb-info">
        <p class="gb-name">{{ site.author }}</p>
        <p class="gb-handle pixel-en">@{{ handle }}</p>
        <p class="gb-motto">{{ site.tagline }}</p>
      </div>

      <!-- 按键区(装饰) -->
      <div class="gb-controls" aria-hidden="true">
        <div class="gb-dpad"><i></i></div>
        <div class="gb-ab">
          <span class="gb-btn pixel-en">B</span>
          <span class="gb-btn pixel-en">A</span>
        </div>
      </div>

      <!-- START 键(真链接)+ 喇叭格栅 -->
      <div class="gb-bottom">
        <a
          class="gb-start pixel-en"
          :href="`https://github.com/${handle}`"
          target="_blank"
          rel="noopener"
          title="GitHub 主页"
        >
          ▶ START
        </a>
        <div class="gb-speaker" aria-hidden="true">
          <i></i><i></i><i></i><i></i><i></i>
        </div>
      </div>
    </div>
  </aside>
</template>
