// 每页的标题 / 描述 / 分享卡片信息
//
// 单测站点是 SPA,真正的 SEO 与分享卡片靠构建期预渲染写入静态 HTML
// (scripts/build-static.mjs 会为每篇文章生成 dist/post/<slug>.html);
// 这里负责**运行期**:路由切换时把 title / meta 更新成当前页面的,
// 免得 51 篇文章在标签页、分享面板里全长一个样。

import { useEffect } from 'react';
import { site } from './site';

type PageMeta = {
  /** 页面标题,会自动带上站点名后缀 */
  title: string;
  /** 一句话描述,写入 description 与 og:description */
  description?: string;
  /** 分享图(相对 public 的路径或绝对 URL) */
  image?: string;
  /** 规范链接(相对站点 base 的路径,如 /post/xxx) */
  path?: string;
};

// 站点自己的部署地址:优先用 site.yml 的 github 仓库名推出来,
// 没配就退回运行时 location.host(GitHub Pages 上两者一致)
function siteOrigin(): string {
  const base = import.meta.env.BASE_URL;
  if (typeof location !== 'undefined') {
    return `${`${location.origin}${base}`.replace(/\/$/, '')}/`;
  }
  return base;
}

function upsertMeta(
  selector: string,
  create: () => HTMLElement,
  apply: (el: HTMLElement) => void,
) {
  let element = document.head.querySelector<HTMLElement>(selector);
  if (!element) {
    element = create();
    document.head.append(element);
  }
  apply(element);
}

export function usePageMeta({ title, description, image, path }: PageMeta) {
  useEffect(() => {
    const fullTitle = title.includes(site.name)
      ? title
      : `${title} · ${site.name}`;
    document.title = fullTitle;

    const url = `${siteOrigin()}${(path ?? '').replace(/^\//, '')}`;
    const shareImage = image
      ? image.startsWith('http')
        ? image
        : `${siteOrigin()}${image.replace(/^\//, '')}`
      : `${siteOrigin()}${site.avatar ? 'avatar.jpeg' : 'favicon.svg'}`;

    upsertMeta(
      'meta[property="og:title"]',
      () => {
        const el = document.createElement('meta');
        el.setAttribute('property', 'og:title');
        return el;
      },
      (el) => el.setAttribute('content', fullTitle),
    );
    upsertMeta(
      'meta[property="og:type"]',
      () => {
        const el = document.createElement('meta');
        el.setAttribute('property', 'og:type');
        return el;
      },
      (el) =>
        el.setAttribute(
          'content',
          path?.startsWith('/post/') ? 'article' : 'website',
        ),
    );
    upsertMeta(
      'meta[property="og:url"]',
      () => {
        const el = document.createElement('meta');
        el.setAttribute('property', 'og:url');
        return el;
      },
      (el) => el.setAttribute('content', url),
    );
    upsertMeta(
      'meta[property="og:image"]',
      () => {
        const el = document.createElement('meta');
        el.setAttribute('property', 'og:image');
        return el;
      },
      (el) => el.setAttribute('content', shareImage),
    );
    if (description) {
      upsertMeta(
        'meta[name="description"]',
        () => {
          const el = document.createElement('meta');
          el.setAttribute('name', 'description');
          return el;
        },
        (el) => el.setAttribute('content', description),
      );
      upsertMeta(
        'meta[property="og:description"]',
        () => {
          const el = document.createElement('meta');
          el.setAttribute('property', 'og:description');
          return el;
        },
        (el) => el.setAttribute('content', description),
      );
    }
  }, [title, description, image, path]);
}
