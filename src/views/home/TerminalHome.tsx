import { Link } from 'react-router-dom';
import { cardCoverProps } from '../../data/coverVariants';
import { formatDateCompact } from '../../data/format';
import { posts } from '../../data/posts';
import { site } from '../../data/site';
import Pagination from './Pagination';
import type { HomeData } from './shared';
import TagFilter from './TagFilter';

// 由 slug 稳定生成一个 7 位十六进制"提交号",让 git log 列表更像真的
function commitHash(slug: string): string {
  let hash = 0;
  for (let index = 0; index < slug.length; index += 1) {
    hash = (hash * 31 + slug.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0').slice(0, 7);
}

// 终端 CLI 首页:提示符 + 巨型口号 + neofetch 面板 + git log 式文章列表
export default function TerminalHome({
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
  const host = `${(site.githubUser || 'visitor').toLowerCase()}@viteblog`;

  return (
    <>
      <section className="tm-hero">
        <p className="tm-cmd">
          <span className="tm-ps1">
            {host}
            <b>:~$</b>
          </span>
          <span className="tm-arg">cat README.md</span>
        </p>
        <h1 className="tm-h">
          {site.tagline}
          <span className="tm-cursor" aria-hidden="true" />
        </h1>
        <p className="tm-sub">
          关于前端、后端与一切踩过的坑。文章以 Markdown 编写,托管在 GitHub
          Pages,<b>每次 push 自动上线</b>。
        </p>
        <p className="tm-press">
          提示:按 <kbd>j</kbd> <kbd>k</kbd> 方向滚动 · 用 <kbd>Tab</kbd>{' '}
          快速聚焦标签
        </p>

        <div className="tm-neofetch">
          <p className="tm-who">
            <b>{host}</b>
            {'\n'}─────────────{'\n'}REACT × VITE{'\n'}EST. {site.since}
          </p>
          <dl className="tm-fetch">
            <dt>posts</dt>
            <dd>
              <b>{posts.length}</b> 篇文章
            </dd>
            <dt>topics</dt>
            <dd>
              <b>{tagCount}</b> 个标签
            </dd>
            <dt>series</dt>
            <dd>
              <b>{seriesCount}</b> 个系列
            </dd>
            <dt>since</dt>
            <dd>
              <b>{site.since}</b> 建站年份
            </dd>
          </dl>
        </div>
      </section>

      <section className="tm-block">
        <p className="tm-cmd">
          <span className="tm-ps1">
            {host}
            <b>:~$</b>
          </span>
          <span className="tm-arg">
            git log --oneline -{visiblePosts.length}
          </span>
        </p>
        <div className="tm-log">
          <div className="tm-log-head">
            <span>commit</span>
            <span>message</span>
            <span className="tm-r">
              {activeTag ? `--tag=${activeTag}` : `共 ${posts.length} 篇`}
            </span>
          </div>
          {visiblePosts.map((post) => (
            <Link
              key={post.slug}
              className="tm-log-row"
              to={`/post/${post.slug}`}
            >
              {/* 有封面的文章在日志行首多铺一张头图,没有 cover 就一行 DOM 都不多 */}
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
              <span className="tm-hash">{commitHash(post.slug)}</span>
              <span className="tm-msg">
                <span className="tm-scope">
                  feat({post.categories[0]?.toLowerCase() ?? 'post'}):
                </span>{' '}
                {post.title}
              </span>
              <span className="tm-tagcol">[{post.tags[0] ?? 'note'}]</span>
              <span className="tm-date">{formatDateCompact(post.date)}</span>
            </Link>
          ))}
        </div>
        {visiblePosts.length === 0 && (
          <p className="empty">这个标签下还没有文章~</p>
        )}
      </section>

      {visibleTags.length > 0 && (
        <section className="tm-block">
          <p className="tm-cmd">
            <span className="tm-ps1">
              {host}
              <b>:~$</b>
            </span>
            <span className="tm-arg">tags --list --top</span>
          </p>
          <TagFilter
            tags={visibleTags}
            activeTag={activeTag}
            totalPosts={posts.length}
            onSelect={onSelectTag}
          />
        </section>
      )}

      <Pagination page={page} totalPages={totalPages} onGoToPage={onGoToPage} />
    </>
  );
}
