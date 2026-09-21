// 文章图片的响应式变体
//
// webp 变体由 scripts/optimize-images.mjs 在构建期生成,清单
// (public/images/images.manifest.json)经 vite 插件注入为虚拟模块 virtual:images-manifest;
// 这里只负责查表,渲染器据此把本地的 /images/xx.jpg 换成 <picture>。
// 清单为空(还没跑过脚本、或站点里一张本地图都没有)时 hasVariants 一律 false,
// 渲染器自动降级成普通 <img>,不需要额外分支。
//
// 远程图(OSS 等)不在清单里,自然也不会被接管。

import manifest from 'virtual:images-manifest';

export interface ImageVariant {
  /** 变体宽度(px),即 srcset 里的 w 描述符 */
  w: number;
  /** 变体地址,已带部署 base,可直接进 srcset */
  src: string;
}

export interface ImageEntry {
  /** 原图尺寸,渲染器写进 width/height 防止加载时布局抖动 */
  width: number;
  height: number;
  /** 按宽度升序的 webp 变体;原图比最窄档位还小时为空数组 */
  variants: ImageVariant[];
}

export type ImageManifest = Record<string, ImageEntry>;

// 部署在 GitHub Pages 的 /ViteBlog/ 子路径下,变体地址得带上 base;dev 下 base 就是 '/'
const BASE = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

// 清单里存的是站点内路径,这里一次性补成能直接进 srcset 的地址(不必每次调用都拼)
const entries: ImageManifest = Object.fromEntries(
  Object.entries(manifest).map(([key, entry]) => [
    key,
    {
      ...entry,
      variants: entry.variants.map((variant) => ({
        ...variant,
        // 清单里存的是站点内路径,补上部署 base 才能直接进 srcset
        src: BASE === '/' ? variant.src : `${BASE}${variant.src.slice(1)}`,
      })),
    },
  ]),
);

// 正文里可能写成 /images/foo.jpg(或许还带查询串或 base),归一成清单的键
function lookup(src: string): ImageEntry | undefined {
  const path = src.split(/[?#]/)[0];
  const rel = path.startsWith(BASE)
    ? path.slice(BASE.length)
    : path.replace(/^\//, '');
  return entries[`/${rel}`];
}

/** 这张本地图有没有可用的 webp 变体(远程图、清单外的图都返回 false) */
export function hasVariants(src: string): boolean {
  return (lookup(src)?.variants.length ?? 0) > 0;
}

/** 取变体信息(至少一条);没有可用变体时返回 undefined。variants 里的 src 已带部署 base */
export function variantsFor(src: string): ImageEntry | undefined {
  const entry = lookup(src);
  return entry?.variants.length ? entry : undefined;
}
