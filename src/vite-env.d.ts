/// <reference types="vite/client" />

// vite.config.ts 里注入的站点配置虚拟模块
declare module 'virtual:site-config' {
  const config: Partial<import('./data/site').Site>;
  export default config;
}

// 按 site.yml 的 theme 字段加载对应主题(样式 + 字体)的虚拟入口
declare module 'virtual:site-theme';
