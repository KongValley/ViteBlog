import type { Post } from '../../data/posts';

// 首页每页文章数(分页逻辑在 Home.tsx,三个主题共用)
export const PAGE_SIZE = 10;

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
