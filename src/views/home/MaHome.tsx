import { Link } from 'react-router-dom';
import { formatDateCompact } from '../../data/format';
import { posts } from '../../data/posts';
import { site } from '../../data/site';
import Pagination from './Pagination';
import { type HomeData, splitTagline } from './shared';

// 汉字序号(前十),列表用
const KANJI = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
// 年份写成汉字,竖排时才不会变成一串数字阶梯
const KANJI_DIGITS = [
  '〇',
  '一',
  '二',
  '三',
  '四',
  '五',
  '六',
  '七',
  '八',
  '九',
];

function kanjiYear(year: number): string {
  return [...String(year)]
    .map((digit) => KANJI_DIGITS[Number(digit)] ?? digit)
    .join('');
}

// 日式极简「间」首页:大留白 + 竖排落款 + 汉字序号的细线列表
export default function MaHome({
  visiblePosts,
  page,
  totalPages,
  activeTag,
  visibleTags,
  onSelectTag,
  onGoToPage,
}: HomeData) {
  const tagCounts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.tags)
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
  const tagCount = tagCounts.size;
  const seriesCount = new Set(posts.flatMap((p) => p.categories)).size;
  const [head, tail] = splitTagline(site.tagline);

  return (
    <>
      <section className="ma-hero">
        <p className="ma-vtitle">
          日々の記録・<b>学び</b>・{kanjiYear(site.since)}
        </p>
        <p className="ma-kicker">MA · 間 · PERSONAL NOTES</p>
        <h1 className="ma-h">
          {head}
          {tail && <em>{tail}</em>}
          <span className="ma-seal" aria-hidden="true">
            記
          </span>
        </h1>
        <p className="ma-sub">
          关于前端、后端与一切踩过的坑。文章以 Markdown 编写,托管在 GitHub
          Pages,<b>每次 push 自动上线</b>。
        </p>
        <div className="ma-cta">
          <a className="ma-btn" href="#posts">
            开始阅读
          </a>
          <Link className="ma-quiet" to="/about">
            关于本站
          </Link>
        </div>
        <div className="ma-stats">
          <div className="ma-stat">
            <b>{posts.length}</b>
            <span>篇文章</span>
          </div>
          <div className="ma-stat">
            <b>{tagCount}</b>
            <span>个标签</span>
          </div>
          <div className="ma-stat">
            <b>{seriesCount}</b>
            <span>个系列</span>
          </div>
          <div className="ma-stat">
            <b>{site.since}</b>
            <span>建站</span>
          </div>
        </div>
      </section>

      <div className="ma-sechead" id="posts">
        <h3>近作</h3>
        <span className="ma-rule" />
        <span>RECENT / {posts.length}</span>
      </div>
      <section className="ma-list">
        {visiblePosts.map((post, index) => (
          <Link key={post.slug} className="ma-row" to={`/post/${post.slug}`}>
            <span className="ma-idx">
              {KANJI[(page - 1) * 10 + index] ?? index + 1}
            </span>
            <span>
              <h4>{post.title}</h4>
              <span className="ma-tags">{post.tags.join(' · ')}</span>
            </span>
            <span className="ma-date">{formatDateCompact(post.date)}</span>
          </Link>
        ))}
        {visiblePosts.length === 0 && (
          <p className="empty">这个标签下还没有文章~</p>
        )}
      </section>

      {visibleTags.length > 0 && (
        <>
          <div className="ma-sechead">
            <h3>标签</h3>
            <span className="ma-rule" />
            <span>TOPICS / {tagCount}</span>
          </div>
          <section className="ma-cloud">
            <button
              type="button"
              className={
                activeTag === '' ? 'ma-cloud-btn is-active' : 'ma-cloud-btn'
              }
              onClick={() => onSelectTag('')}
            >
              全部<span className="ma-count">{posts.length}</span>
            </button>
            {visibleTags.map((tag) => (
              <button
                type="button"
                key={tag}
                className={
                  activeTag === tag ? 'ma-cloud-btn is-active' : 'ma-cloud-btn'
                }
                onClick={() => onSelectTag(activeTag === tag ? '' : tag)}
              >
                {tag}
                <span className="ma-count">{tagCounts.get(tag) ?? 0}</span>
              </button>
            ))}
            <Link to="/tags" className="ma-cloud-btn">
              全部标签 →
            </Link>
          </section>
        </>
      )}

      <Pagination page={page} totalPages={totalPages} onGoToPage={onGoToPage} />
    </>
  );
}
