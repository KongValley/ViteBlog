/// <reference types="vite/client" />

// vite.config.ts 里注入的站点配置虚拟模块
declare module 'virtual:site-config' {
  const config: Partial<import('./data/site').Site>;
  export default config;
}

// 按 site.yml 的 theme 字段加载对应主题(样式 + 字体)的虚拟入口
declare module 'virtual:site-theme';

// vite.config.ts 里扫描 src/posts 得到的元信息列表(正文不在里面,按需 dynamic import)
declare module 'virtual:posts-index' {
  import type { Post } from './data/posts';

  const posts: Post[];
  export default posts;
}

// public/images/images.manifest.json(scripts/optimize-images.mjs 产出)解析后的图片清单
// vite.config.ts 注入的图片变体清单(public/images/images.manifest.json)
// 这里自带结构,不引 src/data/images.ts 的类型 —— 那边要 import 本模块,会成环
declare module 'virtual:images-manifest' {
  const manifest: Record<
    string,
    {
      width: number;
      height: number;
      variants: { w: number; src: string }[];
    }
  >;
  export default manifest;
}
