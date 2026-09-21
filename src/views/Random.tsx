import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { usePageMeta } from '../data/pageMeta';
import { randomPostSlug } from '../data/posts';

// 「随便看一篇」:本身不渲染内容,进来抽一篇就把人送过去。
// 抽签结果放进 state 的惰性初始值定一次 —— StrictMode 的双次渲染和后续重渲染
// 都不会重新抽,否则可能这次渲染抽到 A、下次抽到 B,来回跳。
export default function Random() {
  usePageMeta({ title: '随便看一篇', path: '/random' });
  const [slug] = useState(() => randomPostSlug());

  // 一篇文章都没有时没得抽,直接回首页
  return <Navigate to={slug ? `/post/${slug}` : '/'} replace />;
}
