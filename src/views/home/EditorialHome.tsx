import { Link } from 'react-router-dom';
import { formatDate, formatDateCompact, formatMonth } from '../../data/format';
import { posts } from '../../data/posts';
import { site } from '../../data/site';
import Pagination from './Pagination';
import { type HomeData, PAGE_SIZE } from './shared';
import TagFilter from './TagFilter';

// 现代编辑排版风首页:衬线大标题 + 封面故事 + 杂志式文章列表
export default function EditorialHome({
  visiblePosts,
  page,
  totalPages,
  activeTag,
  visibleTags,
  onSelectTag,
  onGoToPage,
}: HomeData) {
  const tagCount = new Set(posts.flatMap((p) => p.tags)).size;
  const seriesCount = new Set(posts.flatMap((p) => p.categories)).size;

  // 封面故事:仅未筛选的第一页展示,取全站最新一篇
  const showFeatured = activeTag === '' && page === 1 && posts.length > 0;
  const featured = posts[0];
  const newest = visiblePosts[0];

  return (
    <>
      <section className="hero">
        <p className="ed-kicker">个人技术博客 — REACT × VITE</p>
        <h1 className="hero-title">
          {site.tagline}
          <span className="ed-dot">。</span>
        </h1>
        <p className="ed-sub">
          关于前端、后端与一切踩过的坑。文章以 Markdown 编写,托管在 GitHub
          Pages,每次 push 自动上线。
        </p>
        <div className="ed-meta">
          <span>
            <b>{posts.length}</b>篇文章
          </span>
          <span>
            <b>{tagCount}</b>个标签
          </span>
          <span>
            <b>{seriesCount}</b>个系列
          </span>
          <span>
            <b>{site.since}</b>建站
          </span>
        </div>
        <div className="ed-cta">
          <a className="ed-btn" href="#post-list">
            开始阅读 <span className="arr">→</span>
          </a>
          <Link className="ed-quiet" to="/about">
            关于本站
          </Link>
        </div>
      </section>

      {showFeatured && featured && (
        <section className="ed-featured">
          <div className="ed-feat-frame">
            <p className="ed-feat-eyebrow">
              <span>封面故事 / FEATURED</span>
              <b>{formatDate(featured.date)}</b>
            </p>
            <div className="ed-feat-grid">
              <Link className="ed-feat-link" to={`/post/${featured.slug}`}>
                <h2 className="ed-feat-title">{featured.title}</h2>
              </Link>
              <div className="ed-feat-side">
                <p className="ed-feat-excerpt">{featured.excerpt}</p>
                <p className="ed-feat-meta">
                  {featured.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </p>
                <Link className="ed-feat-more" to={`/post/${featured.slug}`}>
                  阅读全文 <span className="arr">→</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {visibleTags.length > 0 && (
        <TagFilter
          tags={visibleTags}
          activeTag={activeTag}
          totalPosts={posts.length}
          onSelect={onSelectTag}
        />
      )}

      <section className="ed-latest" id="post-list">
        <div className="ed-sec-head">
          <h3>最新文章</h3>
          <span>{newest ? formatMonth(newest.date) : ''}</span>
        </div>

        {visiblePosts.map((post, index) => (
          <Link key={post.slug} className="ed-row" to={`/post/${post.slug}`}>
            {/* 有封面图就在条目顶部放一张头图,没有则整行保持原样 */}
            {post.cover && (
              <img
                className="post-card-cover"
                src={post.cover}
                alt=""
                loading="lazy"
                decoding="async"
                data-no-zoom="true"
              />
            )}
            <span className="ed-idx">
              {String((page - 1) * PAGE_SIZE + index + 1).padStart(2, '0')}
            </span>
            <span className="ed-row-t">{post.title}</span>
            <span className="ed-row-tags">{post.tags.join(' · ')}</span>
            <span className="ed-row-date">{formatDateCompact(post.date)}</span>
            <span className="ed-arr" aria-hidden="true">
              →
            </span>
          </Link>
        ))}

        {visiblePosts.length === 0 && (
          <p className="empty">这个标签下还没有文章~</p>
        )}
      </section>

      <Pagination page={page} totalPages={totalPages} onGoToPage={onGoToPage} />
    </>
  );
}
