/// <reference types="vite/client" />

// vite.config.ts 里注入的站点配置虚拟模块
declare module 'virtual:site-config' {
  const config: Partial<import('./data/site').Site>
  export default config
}
