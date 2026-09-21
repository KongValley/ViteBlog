import { Link } from 'react-router-dom';
import { formatDateCompact, formatMonth } from '../../data/format';
import { posts } from '../../data/posts';
import { site } from '../../data/site';
import Pagination from './Pagination';
import { type HomeData, PAGE_SIZE, splitTagline } from './shared';
import TagFilter from './TagFilter';

// 新粗野主义首页:顶部滚动条 + 巨幅标题 + 高饱和统计块 + 巨型跑马灯 + 归档列表
export default function BrutalistHome({
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
  const [head, tail] = splitTagline(site.tagline);
  const newest = visiblePosts[0];

  // 顶部滚动条与跑马灯共用的一串口号
  const slogans = [
    site.tagline,
    'REACT × VITE',
    `${posts.length} POSTS`,
    `${tagCount} TOPICS`,
    `EST. ${site.since}`,
  ];

  return (
    <>
      <div className="br-ticker" aria-hidden="true">
        <div className="br-ticker-track">
          {[0, 1].map((half) =>
            slogans.map((item) => <span key={`${half}-${item}`}>{item}</span>),
          )}
        </div>
      </div>

      <section className="hero">
        <p className="br-kicker">
          个人技术博客 / REACT × VITE / EST. {site.since}
        </p>
        <h1 className="hero-title">
          {head}
          {tail && <span className="br-mark">{tail}</span>}
        </h1>
        <p className="br-sub">
          关于前端、后端与一切踩过的坑。文章以 Markdown 编写,托管在 GitHub
          Pages,每次 push 自动上线。
        </p>
        <div className="br-cta">
          <a className="br-btn br-solid" href="#post-list">
            开始阅读 ↓
          </a>
          <Link className="br-btn br-yellow" to="/about">
            关于本站
          </Link>
        </div>
        <div className="br-stats">
          <div className="br-stat">
            <b>{posts.length}</b>
            <span>篇文章</span>
          </div>
          <div className="br-stat">
            <b>{tagCount}</b>
            <span>个标签</span>
          </div>
          <div className="br-stat">
            <b>{seriesCount}</b>
            <span>个系列</span>
          </div>
          <div className="br-stat">
            <b>{site.since}</b>
            <span>建站年份</span>
          </div>
        </div>
      </section>

      <div className="br-banner" aria-hidden="true">
        <div className="br-banner-track">
          {[0, 1].map((half) =>
            slogans.map((item) => (
              <span key={`${half}-${item}`}>
                {item} <i>✦</i>
              </span>
            )),
          )}
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

      <section className="br-latest" id="post-list">
        <div className="br-sechead">
          <h3>最新文章</h3>
          <span>{newest ? formatMonth(newest.date) : ''}</span>
        </div>

        {visiblePosts.map((post, index) => (
          <Link key={post.slug} className="br-post" to={`/post/${post.slug}`}>
            {/* 有封面时在卡片顶部补一张头图,没封面就什么都不多渲染 */}
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
            <span className="br-no">
              {String((page - 1) * PAGE_SIZE + index + 1).padStart(2, '0')}
            </span>
            <div>
              <h4>{post.title}</h4>
              <div className="br-post-meta">
                {post.tags.map((tag) => (
                  <span key={tag} className="tag tag-small">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <span className="br-date">{formatDateCompact(post.date)}</span>
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
