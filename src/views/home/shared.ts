import type { Post } from '../../data/posts';

// 首页每页文章数(分页逻辑在 Home.tsx,三个主题共用)
export const PAGE_SIZE = 10;

// 把站点标语从中间切成两半,给"标题 + 强调色副标题"的排版用
// 例:"记录学习与生活" → ["记录学习", "与生活"];太短或切不开时返回空副标题
export function splitTagline(tagline: string): [string, string] {
  const chars = [...tagline];
  if (chars.length < 5) return [tagline, ''];
  const half = Math.ceil(chars.length / 2);
  return [chars.slice(0, half).join(''), chars.slice(half).join('')];
}

// Home.tsx 计算好全部状态后按主题分发给对应首页组件
export interface HomeData {
  visiblePosts: Post[];
  page: number;
  totalPages: number;
  activeTag: string;
  visibleTags: string[];
  onSelectTag: (tag: string) => void;
  onGoToPage: (page: number) => void;
}
