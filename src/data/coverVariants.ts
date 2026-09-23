// 文章头图的响应式变体:把 1200×630 的原始 jpg 换成 webp srcset。
//
// 封面图是最重的一块资源:自动封面统一 1200×630,原图 jpg 平均 111 KB,而
// scripts/optimize-images.mjs 早就按 480/960 两档生成了 webp(此前只有正文图片用上)。
// 这里把变体接上 —— 首页卡片头图、文章页头图都走这一个模块。
//
// 返回 React props(不直接吐 JSX),调用方展开到 <img> 上:
//   - 没有变体(远程图、清单外)→ 只回 src,调用方照旧渲染普通 <img>,零行为变化;
//   - 有变体 → src 指到最接近显示宽度的档位,srcset 带上全部档位交给浏览器按 DPR 挑。

import type { ImageEntry } from './images';
import { variantsFor } from './images';

/** 卡片头图显示宽约 300–400px,文章头图满宽约 760px(≥1100px 才展开目录两栏,
 *  900–1100px 时文章满宽到 1040px);窄屏给更小的 sizes,让 480webp 真正被手机用上 */
const CARD_SIZES = '(max-width: 500px) 90vw, (max-width: 700px) 400px, 400px';
const COVER_SIZES =
  '(max-width: 500px) 90vw, (max-width: 1100px) 90vw, 760px';

type CoverAttrs = {
  src: string;
  srcSet?: string;
  sizes?: string;
  width?: number;
  height?: number;
};

function attrsFor(src: string, entry: ImageEntry, sizes: string): CoverAttrs {
  // <img src> 选最接近显示宽度的档位,而不是原图:其余档位交给 srcSet 按 DPR 挑
  const target = window.innerWidth * (window.devicePixelRatio || 1);
  const fallback =
    entry.variants.find((variant) => variant.w >= target) ??
    entry.variants[entry.variants.length - 1];

  return {
    src: fallback?.src ?? src,
    width: entry.width,
    height: entry.height,
    srcSet: entry.variants
      .map((variant) => `${variant.src} ${variant.w}w`)
      .join(', '),
    sizes,
  };
}

/** 卡片头图(列表页,显示宽约 400px);没有 webp 变体时退回原始地址 */
export function cardCoverProps(src: string): CoverAttrs {
  const entry = variantsFor(src);
  if (!entry) return { src };
  return attrsFor(src, entry, CARD_SIZES);
}

/** 文章页头图(满宽);没有 webp 变体时退回原始地址 */
export function coverProps(src: string): CoverAttrs {
  const entry = variantsFor(src);
  if (!entry) return { src };
  return attrsFor(src, entry, COVER_SIZES);
}
