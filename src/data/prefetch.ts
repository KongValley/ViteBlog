// 站内跳转的预取:把「点进去之后才开始的两次串行请求」提前到悬停 / 页面空闲时。
//
// 文章页的路由 chunk(marked + highlight.js,约 70 KB)与每篇正文各自的 chunk
// 都是按需加载的(见 App.tsx 的 lazy 与 data/posts.ts 的 import.meta.glob),
// 不预取的话点开一篇文章要等「路由 chunk → 正文 chunk」两个串行请求,
// 这期间页面只有「正文加载中…」和一段还没排好的版式(目录列是空的)。
//
// 这里只做两件事:悬停/聚焦/按下时按 slug 预取那一篇;页面空闲时预热文章页 chunk。

import { loadPostContent } from './posts';

let postView: Promise<unknown> | undefined;
const warmed = new Set<string>();

/** 文章页路由 chunk(marked、highlight.js 与 Post.css 都在里面) */
export function prefetchPostView(): void {
  if (postView) return;
  postView = import('../views/Post');
}

/** 某一篇:文章页 chunk + 该文正文 chunk */
export function prefetchPost(slug: string): void {
  if (!slug || warmed.has(slug)) return;
  warmed.add(slug);
  prefetchPostView();
  void loadPostContent(slug);
}

/** 空闲时预热:文章页 chunk,外加调用方指定的几篇正文(首页最新的几篇) */
export function warmOnIdle(slugs: string[] = []): void {
  const run = () => {
    prefetchPostView();
    for (const slug of slugs) prefetchPost(slug);
  };
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: 2000 });
    return;
  }
  window.setTimeout(run, 1200);
}

/** 从站内 <a> 里认出文章 slug;不是文章链接就返回空串 */
function slugOf(anchor: HTMLAnchorElement): string {
  if (anchor.target === '_blank' || anchor.hasAttribute('download')) return '';
  let url: URL;
  try {
    url = new URL(anchor.href, location.href);
  } catch {
    return '';
  }
  if (url.origin !== location.origin) return '';
  // BASE_URL 形如 /ViteBlog/,文章链接是 <base>post/<slug>
  const prefix = `${import.meta.env.BASE_URL}post/`;
  if (!url.pathname.startsWith(prefix)) return '';
  return decodeURIComponent(url.pathname.slice(prefix.length)).replace(
    /\/+$/,
    '',
  );
}

/**
 * 全局的「跳转意图」预取:指针悬停、键盘聚焦、手指按下时先取那一篇。
 * 用事件委托挂在 document 上,十个主题的首页卡片、归档、标签/分类页、
 * 文章底部的上下篇与相关推荐都自动受益,不用逐个链接改。
 */
export function installLinkPrefetch(): () => void {
  const onIntent = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest('a');
    if (!(anchor instanceof HTMLAnchorElement)) return;
    const slug = slugOf(anchor);
    if (slug) prefetchPost(slug);
  };
  const events = ['pointerover', 'pointerdown', 'focusin', 'touchstart'];
  for (const name of events) {
    document.addEventListener(name, onIntent, {
      capture: true,
      passive: true,
    });
  }
  return () => {
    for (const name of events) {
      document.removeEventListener(name, onIntent, { capture: true });
    }
  };
}
