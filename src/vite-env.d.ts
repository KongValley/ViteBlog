/// <reference types="vite/client" />

// vite.config.ts 里注入的站点配置虚拟模块
declare module 'virtual:site-config' {
  const config: Partial<import('./data/site').Site>
  export default config
}

// vite.config.ts 里注入的文章创建时间表(文件名 → 毫秒时间戳)
declare module 'virtual:post-times' {
  const times: Record<string, number>
  export default times
}
