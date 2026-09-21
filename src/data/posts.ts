// 文章数据源:元信息由 vite 插件在构建期扫描(src/posts/**/*.md 的 frontmatter),
// 正文按需动态 import —— 首页/列表页只带元信息,进文章页才拉那一篇的原文。
// 新建一篇文章 = 在 src/posts/ 里新建一个 .md 文件,无需改任何代码。

import index from 'virtual:posts-index';
import { parseFrontmatter } from './frontmatter';

export interface Post {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  categories: string[];
  excerpt: string;
  /** 封面图(可选):卡片头图与文章页头图都用它 */
  cover: string;
  /** 正文字数(中日韩按字、其余按词) */
  words: number;
  /** 估算阅读时长(分钟) */
  minutes: number;
}

// 懒加载的正文:每篇文章各自成 chunk
const contentLoaders = import.meta.glob('../posts/**/*.md', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

const loaderBySlug = new Map<string, () => Promise<string>>();
for (const [path, loader] of Object.entries(contentLoaders)) {
  const slug = path.replace(/^\.\.\/posts\//, '').replace(/\.md$/, '');
  loaderBySlug.set(slug, loader);
}

export const posts: Post[] = index as Post[];

/** 取正文(不含 frontmatter);文章不存在时返回空串 */
export async function loadPostContent(slug: string): Promise<string> {
  const loader = loaderBySlug.get(slug);
  if (!loader) return '';
  const raw = await loader();
  return parseFrontmatter(raw).content;
}

export function getPostBySlug(slug: string): Post | undefined {
  return posts.find((post) => post.slug === slug);
}

// 按发布顺序返回相邻文章,用于文章页底部的"上一篇 / 下一篇"
export function adjacentPosts(slug: string): {
  prev: Post | null;
  next: Post | null;
} {
  const position = posts.findIndex((post) => post.slug === slug);
  return {
    prev: posts[position + 1] ?? null,
    next: posts[position - 1] ?? null,
  };
}

export interface Facet {
  name: string;
  count: number;
}

// 标签/分类总览:按文章数倒序,数量相同时按名字排,保证顺序稳定
function facetOf(pick: (post: Post) => string[]): Facet[] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const name of pick(post)) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || (a.name < b.name ? -1 : 1));
}

export function allTags(): Facet[] {
  return facetOf((post) => post.tags);
}

export function allCategories(): Facet[] {
  return facetOf((post) => post.categories);
}

export function postsByTag(tag: string): Post[] {
  return posts.filter((post) => post.tags.includes(tag));
}

export function postsByCategory(category: string): Post[] {
  return posts.filter((post) => post.categories.includes(category));
}

// 归档:按年 → 月分组,组内保持 date 倒序
export function archive(): {
  year: string;
  count: number;
  months: { month: string; posts: Post[] }[];
}[] {
  const years = new Map<string, Map<string, Post[]>>();
  for (const post of posts) {
    const [year = '未知', month = '未知'] = (post.date || '').split(/[- ]/);
    if (!years.has(year)) years.set(year, new Map());
    const months = years.get(year);
    if (!months) continue;
    if (!months.has(month)) months.set(month, []);
    months.get(month)?.push(post);
  }
  return [...years.entries()].map(([year, months]) => {
    const groups = [...months.entries()].map(([month, list]) => ({
      month,
      posts: list,
    }));
    return {
      year,
      count: groups.reduce((sum, group) => sum + group.posts.length, 0),
      months: groups,
    };
  });
}

// 相关文章:同分类 3 分,同标签每个 1 分,取分数最高的几篇
export function relatedPosts(slug: string, limit = 3): Post[] {
  const current = getPostBySlug(slug);
  if (!current) return [];
  return posts
    .filter((post) => post.slug !== slug)
    .map((post) => {
      let score = post.categories.filter((name) =>
        current.categories.includes(name),
      ).length;
      score *= 3;
      score += post.tags.filter((name) => current.tags.includes(name)).length;
      return { post, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || (a.post.date < b.post.date ? 1 : -1))
    .slice(0, limit)
    .map((item) => item.post);
}

/** 随机取一篇的 slug,用于「随机一篇」;可传入当前 slug 避免抽到同一篇 */
export function randomPostSlug(exclude?: string): string | undefined {
  const pool = exclude ? posts.filter((post) => post.slug !== exclude) : posts;
  if (pool.length === 0) return undefined;
  return pool[Math.floor(Math.random() * pool.length)]?.slug;
}

export interface SiteStats {
  posts: number;
  words: number;
  tags: number;
  categories: number;
  /** 最早一篇的日期,用于"从 X 年开始写"之类的文案 */
  since: string;
  /** 全站标签分布(前 N 个),首页数据面板用 */
  topTags: Facet[];
  topCategories: Facet[];
}

export const siteStats: SiteStats = {
  posts: posts.length,
  words: posts.reduce((sum, post) => sum + post.words, 0),
  tags: allTags().length,
  categories: allCategories().length,
  since: posts.at(-1)?.date?.slice(0, 10) ?? '',
  topTags: allTags().slice(0, 8),
  topCategories: allCategories().slice(0, 6),
};
