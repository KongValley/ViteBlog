import { Link } from 'react-router-dom';
import { formatDateCompact } from '../../data/format';
import { posts } from '../../data/posts';
import { site } from '../../data/site';
import Pagination from './Pagination';
import { type HomeData, splitTagline } from './shared';

// 工程蓝图首页:等距线框 + 尺寸标注 + 图签栏,文章列表做成零件表
export default function BlueprintHome({
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
      <section className="bp-hero">
        <svg
          className="bp-iso"
          viewBox="0 0 360 300"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <g transform="translate(190 108)">
            <path
              d="M0 0 L54 31 L0 62 L-54 31 Z"
              fill="currentColor"
              fillOpacity="0.08"
            />
            <path
              d="M-54 31 L-54 54 L0 85 L54 54 L54 31"
              strokeOpacity="0.85"
            />
            <path d="M0 62 L0 85" strokeOpacity="0.6" />
            <path
              d="M0 -30 L36 -9 L0 12 L-36 -9 Z"
              fill="currentColor"
              fillOpacity="0.13"
            />
            <path d="M-36 -9 L-36 12 L0 33 L36 12 L36 -9" strokeOpacity="0.8" />
            <path d="M0 12 L0 33" strokeOpacity="0.55" />
            <path
              d="M0 -58 L22 -45 L0 -32 L-22 -45 Z"
              fill="currentColor"
              fillOpacity="0.18"
            />
            <path
              d="M-22 -45 L-22 -26 L0 -13 L22 -26 L22 -45"
              strokeOpacity="0.8"
            />
            <path d="M0 -32 L0 -13" strokeOpacity="0.55" />
          </g>
          <g strokeOpacity="0.22" strokeDasharray="4 7">
            <path d="M190 130 L40 290 M190 130 L340 290 M190 130 L10 200 M190 130 L370 200" />
          </g>
          <g strokeOpacity="0.5">
            <path d="M60 118 L136 118" strokeDasharray="3 4" />
            <path d="M136 118 L136 128" />
            <path d="M244 300 L244 262" />
          </g>
          <text x="62" y="112">
            FIG.1 结构体
          </text>
          <text x="250" y="292">
            SCALE 1:1
          </text>
        </svg>

        <div className="bp-titleblock">
          <div>
            <span>项目</span>
            <b>{site.name.toUpperCase()}</b>
          </div>
          <div>
            <span>图号</span>
            <b>VB-{site.since}-013</b>
          </div>
          <div>
            <span>比例</span>
            <b>1 : 1</b>
          </div>
          <div>
            <span>日期</span>
            <b>2026.09</b>
          </div>
        </div>

        <p className="bp-kicker">
          DRAWING SET / <b>PERSONAL BLOG</b> / REV.C
        </p>
        <div className="bp-dim">
          <span>宽度 = 视口自适应 · 内容宽度 1140</span>
        </div>
        <h1 className="bp-h">
          {head}
          {tail && <em>{tail}</em>}
        </h1>
        <div className="bp-dim" style={{ marginTop: 14 }}>
          <span>基线 1.16em · 字号 clamp(40, 6.4vw, 78)</span>
        </div>
        <p className="bp-sub">
          关于前端、后端与一切踩过的坑。文章以 Markdown 编写,托管在 GitHub
          Pages,<b>每次 push 自动上线</b>。
        </p>
        <div className="bp-cta">
          <a className="bp-btn bp-solid" href="#bom">
            查看明细表 ↓
          </a>
          <Link className="bp-btn" to="/about">
            关于本站
          </Link>
        </div>
        <div className="bp-stats">
          <div className="bp-stat">
            <b>{posts.length}</b>
            <span>ARTICLES 文章</span>
          </div>
          <div className="bp-stat">
            <b>{tagCount}</b>
            <span>TOPICS 标签</span>
          </div>
          <div className="bp-stat">
            <b>{seriesCount}</b>
            <span>SERIES 系列</span>
          </div>
          <div className="bp-stat">
            <b>{site.since}</b>
            <span>SINCE 建站</span>
          </div>
        </div>
      </section>

      <div className="bp-sechead" id="bom">
        <h3>最近构件</h3>
        <span className="bp-rule" />
        <span>PART LIST / {posts.length}</span>
      </div>
      <table className="bp-table">
        <thead>
          <tr>
            <th>编号</th>
            <th>名称</th>
            <th>规格</th>
            <th style={{ textAlign: 'right' }}>日期</th>
          </tr>
        </thead>
        <tbody>
          {visiblePosts.map((post, index) => (
            <tr key={post.slug}>
              <td className="no">
                <Link to={`/post/${post.slug}`}>
                  {String((page - 1) * 10 + index + 1).padStart(2, '0')}
                </Link>
              </td>
              <td className="name">
                {/* 封面:有 cover 才在标题前插一张头图,没有就保持原来的零件表一行 */}
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
                <Link to={`/post/${post.slug}`}>{post.title}</Link>
              </td>
              <td className="spec">{post.tags.join(' · ')}</td>
              <td className="when">{formatDateCompact(post.date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="bp-legend">
        <span>
          <i>
            {visiblePosts.length > 0
              ? `${String((page - 1) * 10 + 1).padStart(2, '0')}–${String((page - 1) * 10 + visiblePosts.length).padStart(2, '0')}`
              : '00'}
          </i>{' '}
          显示本页 {visiblePosts.length} 项,共 {posts.length} 项
        </span>
        <span>
          公差 <i>±0.02em</i>
        </span>
        <span>
          材料 <i>CSS / HTML</i>
        </span>
        {activeTag && (
          <span>
            筛选 <i>#{activeTag}</i>
          </span>
        )}
      </div>
      {visiblePosts.length === 0 && (
        <p className="empty">这个标签下还没有文章~</p>
      )}

      {visibleTags.length > 0 && (
        <>
          <div className="bp-sechead">
            <h3>标注索引</h3>
            <span className="bp-rule" />
            <span>TOPIC INDEX / {tagCount}</span>
          </div>
          <section className="bp-chips">
            {visibleTags.map((tag) => (
              <button
                type="button"
                key={tag}
                className={activeTag === tag ? 'bp-chip bp-chip-on' : 'bp-chip'}
                onClick={() => onSelectTag(activeTag === tag ? '' : tag)}
              >
                {tag}
              </button>
            ))}
            <Link className="bp-chip" to="/tags">
              全部标签 →
            </Link>
          </section>
        </>
      )}

      {newest && (
        <p className="bp-legend" style={{ marginTop: 18 }}>
          <span>
            修订记录 · 最新 <i>{formatDateCompact(newest.date)}</i>
          </span>
        </p>
      )}

      <Pagination page={page} totalPages={totalPages} onGoToPage={onGoToPage} />
    </>
  );
}
