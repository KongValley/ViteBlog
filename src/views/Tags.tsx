import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '../data/pageMeta';
import { allCategories, allTags, posts } from '../data/posts';
import './Tags.css';

type SortMode = 'count' | 'name';

// 标签总览页:全部标签 + 数量、排序切换、按分类过滤,点击回到首页套用筛选
export default function Tags() {
  const [sort, setSort] = useState<SortMode>('count');
  const [category, setCategory] = useState('');
  const categories = useMemo(() => allCategories(), []);

  // 选了分类就只统计该分类下的文章,标签数量随之变化
  const scoped = useMemo(
    () =>
      category
        ? posts.filter((post) => post.categories.includes(category))
        : posts,
    [category],
  );

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const post of scoped) {
      for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => {
      if (sort === 'name') return a[0].localeCompare(b[0], 'zh-Hans-CN');
      return b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hans-CN');
    });
    return sorted;
  }, [scoped, sort]);

  // 标签云字号:按文章数分三档,最热的标签最大
  const maxCount = tagCounts[0]?.[1] ?? 1;
  const levelOf = (count: number) => {
    if (count >= Math.max(2, Math.ceil(maxCount * 0.6))) return 'tag-cloud-lg';
    if (count >= Math.max(2, Math.ceil(maxCount * 0.3))) return 'tag-cloud-md';
    return '';
  };

  const totalTags = useMemo(() => allTags().length, []);

  usePageMeta({
    title: '全部标签',
    description: `共 ${totalTags} 个标签,按使用次数排序,可切换排序方式或按分类过滤。`,
    path: '/tags',
  });

  return (
    <div className="tags-page">
      <h2 className="section-title">全部标签</h2>
      <p className="tags-summary">
        共 {totalTags} 个标签 · {posts.length} 篇文章 · 点击标签查看对应文章
      </p>

      <div className="tags-toolbar">
        <div className="tags-filter">
          <button
            type="button"
            className={category === '' ? 'tag-toggle is-active' : 'tag-toggle'}
            onClick={() => setCategory('')}
          >
            全部分类
          </button>
          {categories.map((item) => (
            <button
              key={item.name}
              type="button"
              className={
                category === item.name ? 'tag-toggle is-active' : 'tag-toggle'
              }
              onClick={() => setCategory(item.name)}
            >
              {item.name}
              <span className="tag-count">{item.count}</span>
            </button>
          ))}
        </div>

        <div className="tags-sort">
          <button
            type="button"
            className={sort === 'count' ? 'tag-toggle is-active' : 'tag-toggle'}
            onClick={() => setSort('count')}
          >
            按数量
          </button>
          <button
            type="button"
            className={sort === 'name' ? 'tag-toggle is-active' : 'tag-toggle'}
            onClick={() => setSort('name')}
          >
            按名称
          </button>
        </div>
      </div>

      {category && (
        <p className="tags-summary">
          「{category}」分类下共 {scoped.length} 篇,涉及 {tagCounts.length}{' '}
          个标签
        </p>
      )}

      <div className="tag-cloud">
        {tagCounts.map(([tag, count]) => (
          <Link
            key={tag}
            to={`/?tag=${encodeURIComponent(tag)}`}
            className={`tag tag-cloud-item ${levelOf(count)}`.trim()}
          >
            {tag}
            <span className="tag-count">{count}</span>
          </Link>
        ))}
      </div>

      {tagCounts.length === 0 && (
        <p className="tags-summary">这个分类下还没有带标签的文章。</p>
      )}
    </div>
  );
}
