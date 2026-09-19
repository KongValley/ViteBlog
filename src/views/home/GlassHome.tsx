import { Link } from 'react-router-dom';
import { formatDateCompact, formatMonth } from '../../data/format';
import { posts } from '../../data/posts';
import { site } from '../../data/site';
import Pagination from './Pagination';
import { type HomeData, splitTagline } from './shared';
import TagFilter from './TagFilter';

// 玻璃拟态首页:渐变光斑背景 + 居中英雄区 + 数据玻璃条 + 毛玻璃文章卡片
export default function GlassHome({
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

  return (
    <>
      <section className="gl-hero">
        <span className="gl-kicker">持续更新中 · EST. {site.since}</span>
        <h1 className="gl-h">
          {head}
          {tail && <em>{tail}</em>}
        </h1>
        <p className="gl-sub">
          关于前端、后端与一切踩过的坑。文章以 Markdown 编写,托管在 GitHub
          Pages,每次 push 自动上线。
        </p>
        <div className="gl-cta">
          <a className="gl-btn gl-btn-solid" href="#post-list">
            开始阅读
          </a>
          <Link className="gl-btn gl-btn-glass" to="/about">
            关于本站
          </Link>
        </div>
        <div className="gl-stats">
          <div className="gl-stat">
            <b>{posts.length}</b>
            <span>篇文章</span>
          </div>
          <div className="gl-stat">
            <b>{tagCount}</b>
            <span>个标签</span>
          </div>
          <div className="gl-stat">
            <b>{seriesCount}</b>
            <span>个系列</span>
          </div>
          <div className="gl-stat">
            <b>{site.since}</b>
            <span>建站年份</span>
          </div>
        </div>
      </section>

      <section className="gl-latest" id="post-list">
        {visibleTags.length > 0 && (
          <TagFilter
            tags={visibleTags}
            activeTag={activeTag}
            totalPosts={posts.length}
            onSelect={onSelectTag}
          />
        )}

        <div className="gl-sechead">
          <h3>最新文章</h3>
          <span>{newest ? formatMonth(newest.date) : ''}</span>
        </div>

        <div className="gl-cards">
          {visiblePosts.map((post) => (
            <Link key={post.slug} className="gl-card" to={`/post/${post.slug}`}>
              <span className="gl-tags">
                {post.tags.map((tag) => (
                  <span key={tag} className="gl-chip">
                    {tag}
                  </span>
                ))}
              </span>
              <h4>{post.title}</h4>
              <p className="gl-exc">{post.excerpt}</p>
              <span className="gl-meta">
                <span>{formatDateCompact(post.date)}</span>
                <span className="gl-go">阅读 →</span>
              </span>
            </Link>
          ))}
        </div>

        {visiblePosts.length === 0 && (
          <p className="empty">这个标签下还没有文章~</p>
        )}
      </section>

      <Pagination page={page} totalPages={totalPages} onGoToPage={onGoToPage} />
    </>
  );
}
