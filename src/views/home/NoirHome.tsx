import { Link } from 'react-router-dom';
import { formatDateCompact } from '../../data/format';
import { posts } from '../../data/posts';
import { site } from '../../data/site';
import Pagination from './Pagination';
import { type HomeData, splitTagline } from './shared';

// 暗夜霓虹首页:霓虹招牌标题(下半句描边)+ 点唱机式歌单列表
export default function NoirHome({
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

  return (
    <>
      <section className="nr-hero">
        <span className="nr-kicker">After Hours · Open Till Late</span>
        <h1 className="nr-h nr-flicker">
          {head}
          {tail && (
            <>
              <br />
              <span className="nr-out">{tail}</span>
            </>
          )}
        </h1>
        <p className="nr-sub">
          关于前端、后端与一切踩过的坑。文章以 Markdown 编写,托管在 GitHub
          Pages,<b>每次 push 自动上线</b>。
        </p>
        <div className="nr-cta">
          <a className="nr-btn" href="#list">
            开始阅读
          </a>
          <Link className="nr-btn nr-ghost" to="/about">
            关于本站
          </Link>
        </div>
        <div className="nr-stats">
          <div className="nr-stat">
            <b>{posts.length}</b>
            <span>篇文章</span>
          </div>
          <div className="nr-stat">
            <b>{tagCount}</b>
            <span>个标签</span>
          </div>
          <div className="nr-stat">
            <b>{seriesCount}</b>
            <span>个系列</span>
          </div>
          <div className="nr-stat">
            <b>{site.since}</b>
            <span>建站年份</span>
          </div>
        </div>
      </section>

      <div className="nr-sechead" id="list">
        <h3>今晚歌单</h3>
        <span className="nr-rule" />
        <span>LATEST / {posts.length}</span>
      </div>
      <section className="nr-list">
        {visiblePosts.map((post, index) => (
          <Link key={post.slug} className="nr-item" to={`/post/${post.slug}`}>
            {/* 有封面就在行首横跨整行贴一张头图,没有则整段不渲染 */}
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
            <span className="nr-no">
              {String((page - 1) * 10 + index + 1).padStart(2, '0')}
            </span>
            <span>
              <h4>{post.title}</h4>
              <span className="nr-tags">{post.tags.join(' · ')}</span>
            </span>
            <span className="nr-when">{formatDateCompact(post.date)}</span>
          </Link>
        ))}
        {visiblePosts.length === 0 && (
          <p className="empty">这个标签下还没有文章~</p>
        )}
      </section>

      {visibleTags.length > 0 && (
        <>
          <div className="nr-sechead">
            <h3>标签</h3>
            <span className="nr-rule" />
            <span>TAGS / {tagCount}</span>
          </div>
          <section className="nr-chips">
            {visibleTags.map((tag) => (
              <button
                type="button"
                key={tag}
                className={activeTag === tag ? 'nr-chip nr-chip-on' : 'nr-chip'}
                onClick={() => onSelectTag(activeTag === tag ? '' : tag)}
              >
                {tag}
              </button>
            ))}
            <Link className="nr-chip" to="/tags">
              全部标签 →
            </Link>
          </section>
        </>
      )}

      <Pagination page={page} totalPages={totalPages} onGoToPage={onGoToPage} />
    </>
  );
}
