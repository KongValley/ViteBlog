<script setup lang="ts">
import { site } from '../data/site'
</script>

<template>
  <aside class="player-card" aria-label="站长信息">
    <div class="gb-shell">
      <!-- 机身顶部凹槽线 -->
      <div class="gb-grooves" aria-hidden="true"><i></i><i></i></div>

      <!-- 深色条纹:电源灯 + 屏幕 -->
      <div class="gb-stripe">
        <span class="gb-stripe-text pixel-en">DOT MATRIX WITH STEREO SOUND</span>
        <span class="gb-led" aria-hidden="true"></span>
        <!-- 电源图标(替代 BATTERY 文字,小字号点阵字会缺字) -->
        <svg
          class="gb-power-icon"
          viewBox="0 0 12 12"
          width="11"
          height="11"
          aria-hidden="true"
        >
          <path
            d="M6 1v5"
            stroke="#b9bdc4"
            stroke-width="1.6"
            stroke-linecap="round"
            fill="none"
          />
          <path
            d="M3.2 2.8a4.4 4.4 0 1 0 5.6 0"
            stroke="#b9bdc4"
            stroke-width="1.6"
            stroke-linecap="round"
            fill="none"
          />
        </svg>

        <a
          class="gb-screen"
          :href="`https://github.com/${site.githubUser}`"
          target="_blank"
          rel="noopener"
          title="点击访问我的 GitHub 主页"
        >
          <img
            class="gb-avatar"
            :src="site.avatar"
            :alt="`${site.author} 的头像`"
            width="120"
            height="120"
            loading="eager"
          />
          <span class="gb-screen-name">
            <span class="blink" aria-hidden="true">▶</span>
            {{ site.author }}
          </span>
        </a>
      </div>

      <!-- 仿 GB 机身 logo -->
      <p class="gb-logo">{{ site.name }} <b>GAME BOY</b><sup>™</sup></p>

      <!-- 按键:D-pad 左,B/A 右(A 高 B 低) -->
      <div class="gb-controls">
        <div class="gb-dpad" aria-hidden="true"><i></i></div>
        <div class="gb-ab">
          <span class="gb-key">
            <span class="gb-btn-round" aria-hidden="true"></span>
            <b class="gb-key-label pixel-en">B</b>
          </span>
          <span class="gb-key gb-key-a">
            <span class="gb-btn-round" aria-hidden="true"></span>
            <b class="gb-key-label pixel-en">A</b>
          </span>
        </div>
      </div>

      <!-- SELECT / START 胶囊键(START 是真链接) -->
      <div class="gb-mid">
        <span class="gb-pill-wrap" aria-hidden="true">
          <span class="gb-pill"></span>
          <b class="gb-pill-label">SELECT</b>
        </span>
        <a
          class="gb-pill-wrap gb-pill-link"
          :href="`https://github.com/${site.githubUser}`"
          target="_blank"
          rel="noopener"
          title="GitHub 主页"
        >
          <span class="gb-pill"></span>
          <b class="gb-pill-label">START</b>
        </a>
      </div>

      <!-- 右下角喇叭格栅 -->
      <div class="gb-speaker" aria-hidden="true">
        <i></i><i></i><i></i><i></i><i></i><i></i>
      </div>
    </div>

    <!-- 玩家信息放在机身下方 -->
    <div class="gb-id">
      <p class="gb-name">{{ site.author }}</p>
      <p class="gb-handle pixel-en">@{{ site.githubUser }}</p>
      <p class="gb-motto">{{ site.tagline }}</p>
    </div>
  </aside>
</template>
