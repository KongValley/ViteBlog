import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePageMeta } from '../data/pageMeta';
import { posts } from '../data/posts';
import { site } from '../data/site';
import BentoHome from './home/BentoHome';
import BlueprintHome from './home/BlueprintHome';
import BrutalistHome from './home/BrutalistHome';
import EditorialHome from './home/EditorialHome';
import GlassHome from './home/GlassHome';
import MaHome from './home/MaHome';
import NoirHome from './home/NoirHome';
import PixelHome from './home/PixelHome';
import SwissHome from './home/SwissHome';
import { type HomeData, PAGE_SIZE } from './home/shared';
import TerminalHome from './home/TerminalHome';

const MAX_HOME_TAGS = 10;

// 首页调度器:负责标签筛选、分页等全部状态,
// 再按 site.yml 里选定的主题渲染对应的一套首页结构
export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  // 标签筛选放在 URL 参数里,标签总览页可以带 ?tag= 直达某个筛选结果
  const activeTag = searchParams.get('tag') ?? '';

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const post of posts) {
      for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return counts;
  }, []);
  // 标签按文章数从多到少排,首页只露出常用的一批,其余进标签总览页
  const sortedTags = useMemo(
    () =>
      [...tagCounts.keys()].sort(
        (a, b) =>
          (tagCounts.get(b) ?? 0) - (tagCounts.get(a) ?? 0) || (a < b ? -1 : 1),
      ),
    [tagCounts],
  );
  const visibleTags = useMemo(() => {
    const top = sortedTags.slice(0, MAX_HOME_TAGS);
    if (activeTag && !top.includes(activeTag)) top.push(activeTag);
    return top;
  }, [sortedTags, activeTag]);

  usePageMeta({
    title: activeTag ? `标签:${activeTag}` : `${site.name} · ${site.tagline}`,
    description: activeTag
      ? `${site.name} 里「${activeTag}」标签下的全部文章。`
      : site.tagline,
    path: activeTag ? `/?tag=${encodeURIComponent(activeTag)}` : '/',
  });

  const filtered = activeTag
    ? posts.filter((p) => p.tags.includes(activeTag))
    : posts;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(
    Math.max(1, Number(searchParams.get('page')) || 1),
    totalPages,
  );
  const visiblePosts = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selectTag = (tag: string) => {
    // 换标签时重置回第一页
    setSearchParams(tag ? { tag } : {}, { replace: true });
  };

  const goToPage = (next: number) => {
    const params: Record<string, string> = {};
    if (activeTag) params.tag = activeTag;
    if (next !== 1) params.page = String(next);
    setSearchParams(params);
    window.scrollTo(0, 0);
  };

  const data: HomeData = {
    visiblePosts,
    page,
    totalPages,
    activeTag,
    visibleTags,
    onSelectTag: selectTag,
    onGoToPage: goToPage,
  };

  // 主题在构建期由 site.yml 的 theme 字段决定
  if (site.theme === 'swiss') return <SwissHome {...data} />;
  if (site.theme === 'editorial') return <EditorialHome {...data} />;
  if (site.theme === 'brutalist') return <BrutalistHome {...data} />;
  if (site.theme === 'bento') return <BentoHome {...data} />;
  if (site.theme === 'terminal') return <TerminalHome {...data} />;
  if (site.theme === 'glass') return <GlassHome {...data} />;
  if (site.theme === 'ma') return <MaHome {...data} />;
  if (site.theme === 'blueprint') return <BlueprintHome {...data} />;
  if (site.theme === 'noir') return <NoirHome {...data} />;
  return <PixelHome {...data} />;
}
