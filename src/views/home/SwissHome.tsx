import { Link } from 'react-router-dom';
import { formatDate } from '../../data/format';
import { posts } from '../../data/posts';
import { site } from '../../data/site';
import Pagination from './Pagination';
import { type HomeData, PAGE_SIZE } from './shared';
import TagFilter from './TagFilter';

// 瑞士网格风首页:巨幅标题 + 数据统计栏 + 跑马灯 + 归档式列表
export default function SwissHome({
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
  const marqueeItems = [
    site.tagline,
    'REACT × VITE',
    `${posts.length} POSTS`,
    `${tagCount} TOPICS`,
    `EST. ${site.since}`,
  ];

  return (
    <>
      <section className="hero">
        <p className="sw-kicker">
          个人技术博客 / REACT × VITE / EST. {site.since}
        </p>
        <h1 className="hero-title">
          {site.tagline}
          <span className="sw-sq" aria-hidden="true" />
        </h1>
        <p className="sw-sub">
          关于前端、后端与一切踩过的坑。文章以 Markdown 编写,托管在 GitHub
          Pages,每次 push 自动上线。
        </p>
        <div className="sw-cta">
          <a className="sw-btn sw-solid" href="#post-list">
            开始阅读 ↘
          </a>
          <Link className="sw-btn" to="/about">
            关于本站
          </Link>
        </div>
        <div className="sw-stats">
          <div className="sw-stat">
            <b>{posts.length}</b>
            <span>篇文章</span>
          </div>
          <div className="sw-stat">
            <b>{tagCount}</b>
            <span>个标签</span>
          </div>
          <div className="sw-stat">
            <b>{seriesCount}</b>
            <span>个系列</span>
          </div>
          <div className="sw-stat">
            <b>{site.since}</b>
            <span>建站年份</span>
          </div>
        </div>
      </section>

      <div className="sw-marquee" aria-hidden="true">
        <div className="sw-marquee-track">
          {[0, 1].map((half) => (
            <span className="sw-marquee-half" key={half}>
              {marqueeItems.map((item) => (
                <span key={item}>
                  {item} <i>✱</i>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {visibleTags.length > 0 && (
        <TagFilter
          tags={visibleTags}
          activeTag={activeTag}
          totalPosts={posts.length}
          onSelect={onSelectTag}
        />
      )}

      <section className="post-list" id="post-list">
        {visiblePosts.map((post, index) => (
          <article key={post.slug} className="post-card">
            {/* 有封面时在卡片最前面补一张整幅头图,没有则一行都不多渲染 */}
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
            <Link to={`/post/${post.slug}`} className="post-card-link">
              <span className="post-index">
                {String((page - 1) * PAGE_SIZE + index + 1).padStart(2, '0')}
              </span>
              <h2 className="post-card-title">{post.title}</h2>
              <div className="post-card-meta">
                <time className="post-card-date">{formatDate(post.date)}</time>
                {post.tags.map((tag) => (
                  <span key={tag} className="tag tag-small">
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          </article>
        ))}

        {visiblePosts.length === 0 && (
          <p className="empty">这个标签下还没有文章~</p>
        )}
      </section>

      <Pagination page={page} totalPages={totalPages} onGoToPage={onGoToPage} />
    </>
  );
}
