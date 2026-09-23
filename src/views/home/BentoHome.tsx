import { Link } from 'react-router-dom';
import { cardCoverProps } from '../../data/coverVariants';
import { formatDateCompact } from '../../data/format';
import { posts } from '../../data/posts';
import { site } from '../../data/site';
import Pagination from './Pagination';
import { type HomeData, splitTagline } from './shared';

// 便当格首页:紧凑英雄区 + 六栏卡片矩阵(特性卡 / 数据块 / 标签云 /
// 最近更新 / 作者 / 系列),筛选与分页沿用 URL 状态
export default function BentoHome({
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

  // 特性卡:未筛选的第一页展示全站最新一篇,否则展示当前筛选下的第一篇
  const featured =
    activeTag === '' && page === 1 && visiblePosts.length > 0
      ? posts[0]
      : visiblePosts[0];

  const seriesList = [...new Set(posts.flatMap((p) => p.categories))].slice(
    0,
    4,
  );
  const seriesColors = [
    'var(--be-accent)',
    'var(--be-amber)',
    'var(--be-pink)',
    'var(--be-green)',
  ];
  const avatarLetter = [...site.author][0] ?? 'B';

  return (
    <>
      <section className="hero">
        <span className="be-kicker">持续更新中 · EST. {site.since}</span>
        <h1 className="hero-title">
          {head}
          {tail && <em>{tail}</em>}
        </h1>
        <p className="be-sub">
          关于前端、后端与一切踩过的坑。文章以 Markdown 编写,托管在 GitHub
          Pages,每次 push 自动上线。
        </p>
      </section>

      <section className="bento">
        {featured && (
          <Link className="cell feat" to={`/post/${featured.slug}`}>
            <span className="cell-label">
              <i style={{ background: 'var(--be-accent)' }} />
              最新发布
            </span>
            <h2>{featured.title}</h2>
            <p>{featured.excerpt}</p>
            <span className="be-tags">
              {featured.tags.map((tag) => (
                <span key={tag} className="chip">
                  {tag}
                </span>
              ))}
            </span>
            <span className="more">
              阅读全文 <i>→</i>
            </span>
          </Link>
        )}

        <div className="cell stat c-blue">
          <span className="cell-label">
            <i style={{ background: 'var(--be-accent)' }} />
            文章
          </span>
          <b>{posts.length}</b>
          <span>篇持续累积</span>
        </div>

        <div className="cell stat c-green">
          <span className="cell-label">
            <i style={{ background: 'var(--be-green)' }} />
            标签
          </span>
          <b>{tagCount}</b>
          <span>个知识标签</span>
        </div>

        <div className="cell tags-cell">
          <span className="cell-label">
            <i style={{ background: 'var(--be-pink)' }} />
            标签云
          </span>
          <span className="cloud">
            {visibleTags.map((tag) => (
              <button
                type="button"
                key={tag}
                className={activeTag === tag ? 'cloud-btn active' : 'cloud-btn'}
                onClick={() => onSelectTag(activeTag === tag ? '' : tag)}
              >
                {tag}
              </button>
            ))}
          </span>
          <Link className="link" to="/tags">
            全部标签 →
          </Link>
        </div>

        <div className="cell author">
          <div className="avatar">{avatarLetter}</div>
          <span>
            <b>{site.author}</b>
            {site.githubUser && (
              <>
                <br />@{site.githubUser}
              </>
            )}
          </span>
        </div>

        <div className="cell series">
          <span className="cell-label">
            <i style={{ background: 'var(--be-green)' }} />
            系列 · {seriesCount}
          </span>
          {seriesList.map((name, index) => (
            <span className="s" key={name}>
              <i style={{ background: seriesColors[index] }} />
              {name}
            </span>
          ))}
        </div>

        <div className="cell list-cell">
          <span className="cell-label">
            <i style={{ background: 'var(--be-amber)' }} />
            最近更新
          </span>
          {visiblePosts.map((post) => (
            <Link key={post.slug} className="row" to={`/post/${post.slug}`}>
              {/* 封面:只有带 cover 的文章才在行首顶一张头图,没有就还是原来的一行字 */}
              {post.cover && (
                <img
                  className="post-card-cover"
                  {...cardCoverProps(post.cover)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  data-no-zoom="true"
                />
              )}
              <span className="t">{post.title}</span>
              <span className="d">{formatDateCompact(post.date).slice(5)}</span>
            </Link>
          ))}
          {visiblePosts.length === 0 && (
            <p className="empty">这个标签下还没有文章~</p>
          )}
        </div>
      </section>

      <Pagination page={page} totalPages={totalPages} onGoToPage={onGoToPage} />
    </>
  );
}
