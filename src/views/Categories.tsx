import { Link } from 'react-router-dom';
import '../components/Archive.css';
import { usePageMeta } from '../data/pageMeta';
import { allCategories, postsByCategory, siteStats } from '../data/posts';

// 总览页里每个分类最多预览几篇标题,再多就进详情页看
const PREVIEW_LIMIT = 3;

// 分类总览:像档案索引一样列出全部分类(篇数 + 最近几篇的入口)
export default function Categories() {
  // allCategories() 已按篇数倒序、数量相同时按名字排,顺序是稳定的
  const groups = allCategories().map((facet) => {
    const list = postsByCategory(facet.name);
    return { ...facet, preview: list.slice(0, PREVIEW_LIMIT) };
  });

  usePageMeta({
    title: '分类',
    description: `按分类浏览 ${siteStats.posts} 篇文章,共 ${groups.length} 个分类。`,
    path: '/categories',
  });

  return (
    <section className="archive-page">
      <header className="archive-head">
        <h1 className="archive-title">分类</h1>
        <p className="archive-sub">
          共 <b className="archive-count">{groups.length}</b> 个分类 ·{' '}
          <b className="archive-count">{siteStats.posts}</b> 篇文章
        </p>
      </header>

      {groups.length === 0 ? (
        <p className="archive-empty">还没有文章,自然也就没有分类。</p>
      ) : (
        <ul className="archive-cats">
          {groups.map((group, index) => {
            const href = `/categories/${encodeURIComponent(group.name)}`;
            return (
              <li key={group.name} className="archive-cat">
                <div className="archive-cat-head">
                  {/* 卡号只是视觉上的序号,读屏时无意义 */}
                  <span className="archive-cat-index" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <Link className="archive-cat-name" to={href}>
                    {group.name}
                  </Link>
                  <span className="archive-cat-count">{group.count} 篇</span>
                </div>

                <ul className="archive-cat-preview">
                  {group.preview.map((post) => (
                    <li key={post.slug}>
                      <Link
                        className="archive-preview-link"
                        to={`/post/${post.slug}`}
                      >
                        {post.title}
                      </Link>
                    </li>
                  ))}
                </ul>

                {group.count > group.preview.length && (
                  <Link className="archive-cat-more" to={href}>
                    查看全部 {group.count} 篇 →
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
