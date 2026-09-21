import {
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import MarkdownBody from '../components/MarkdownBody';
import MobileToc from '../components/MobileToc';
import ReadingProgress from '../components/ReadingProgress';
import ShareBar from '../components/ShareBar';
import { excerptFromMarkdown } from '../data/excerpt';
import { formatDate } from '../data/format';
import { renderMarkdown } from '../data/markdown';
import { usePageMeta } from '../data/pageMeta';
import {
  adjacentPosts,
  getPostBySlug,
  loadPostContent,
  relatedPosts,
} from '../data/posts';
import './Post.css';

type TocItem = { id: string; text: string; level: 2 | 3 };

// 从 Markdown 源码里提取二、三级标题作为目录项,并生成对应顺序的 id 列表
function buildToc(content: string): { toc: TocItem[]; ids: string[] } {
  const toc: TocItem[] = [];
  const ids: string[] = [];
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^(#{2,3})\s+(.*)$/);
    if (!match) continue;
    const id = `toc-${ids.length}`;
    ids.push(id);
    toc.push({
      id,
      text: match[2].replace(/[*`]/g, '').trim(),
      level: match[1].length as 2 | 3,
    });
  }
  return { toc, ids };
}

// 按出现顺序给渲染结果里的 h2/h3 注入同样的 id
function injectHeadingIds(html: string, ids: string[]): string {
  let index = 0;
  return html.replace(/<h([23])>/g, (_match, level: string) => {
    const id = ids[index] ?? `toc-${index}`;
    index += 1;
    return `<h${level} id="${id}">`;
  });
}

export default function Post() {
  const slug = useParams()['*'] ?? '';
  const navigate = useNavigate();
  const post = getPostBySlug(slug);
  const { prev, next } = adjacentPosts(slug);
  const related = useMemo(() => relatedPosts(slug, 3), [slug]);

  // 正文是按需拉取的:首页与列表页不需要它,这里进文章页才加载
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setContent('');
    void loadPostContent(slug).then((text) => {
      if (cancelled) return;
      setContent(text);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // 正文里的站内链接已带上部署 base,拦截下来走 SPA 跳转,免去整页刷新;
  // 外链、锚点、修饰键点击(新标签打开)一概放行
  const handleContentClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    const anchor = (event.target as HTMLElement).closest('a');
    if (!anchor || anchor.target === '_blank') return;
    const href = anchor.getAttribute('href') ?? '';
    const base = import.meta.env.BASE_URL;
    if (!href.startsWith(base)) return;
    event.preventDefault();
    navigate(href.slice(base.length - 1));
  };

  // 所有 Hook 必须在提前 return 之前调用(React Hooks 规则),
  // 否则从有效文章跳到不存在文章时,Hook 数量变化会直接报错。
  const { html, toc } = useMemo(() => {
    if (!content) return { html: '', toc: [] as TocItem[] };
    const { toc: items, ids } = buildToc(content);
    return { html: injectHeadingIds(renderMarkdown(content), ids), toc: items };
  }, [content]);

  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    if (toc.length === 0) return;
    const onScroll = () => {
      let current = '';
      for (const item of toc) {
        const el = document.getElementById(item.id);
        if (el && el.getBoundingClientRect().top <= 120) current = item.id;
      }
      setActiveId(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [toc]);

  usePageMeta({
    title: post?.title ?? '文章不存在',
    description: post?.excerpt || undefined,
    // 分享卡自带标题,比纯图案的封面更适合做链接预览,所以只有手填封面时才用封面
    image: post?.coverExplicit
      ? post.cover
      : `/og/${slug.replace(/\//g, '__')}.png`,
    path: `/post/${slug}`,
  });

  const jumpTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!post) {
    return (
      <section className="empty-block">
        <p className="game-over pixel-en blink">GAME OVER</p>
        <p className="empty">文章不存在,可能已被删除或链接有误。</p>
        <Link to="/" className="back-home">
          ← 返回首页
        </Link>
      </section>
    );
  }

  return (
    <article className="post">
      <ReadingProgress />

      {toc.length > 0 && (
        <aside className="toc-wrap" aria-label="文章目录">
          <div className="toc-rod" />
          <div className="toc-paper">
            <p className="toc-title">目 录</p>
            <ul className="toc-list">
              {toc.map((item) => (
                <li
                  key={item.id}
                  className={item.level === 3 ? 'toc-h3' : undefined}
                >
                  <a
                    href={`#${item.id}`}
                    className={
                      activeId === item.id ? 'toc-link toc-active' : 'toc-link'
                    }
                    onClick={(event) => {
                      event.preventDefault();
                      jumpTo(item.id);
                    }}
                  >
                    {item.text}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="toc-rod toc-rod-bottom" />
        </aside>
      )}

      {toc.length > 0 && <MobileToc toc={toc} activeId={activeId} />}

      <div className="post-body">
        <header className="post-header">
          {post.cover && (
            <img
              className="post-cover"
              src={post.cover}
              alt=""
              data-no-zoom="true"
              loading="eager"
              decoding="async"
            />
          )}
          <h1 className="post-title">{post.title}</h1>
          <div className="post-meta">
            <time>{formatDate(post.date)}</time>
            <span className="post-stat">
              {post.minutes} 分钟 · {post.words} 字
            </span>
            {post.categories.map((category) => (
              <Link
                key={category}
                className="tag tag-small"
                to={`/categories/${encodeURIComponent(category)}`}
              >
                {category}
              </Link>
            ))}
            {post.tags.map((tag) => (
              <span key={tag} className="tag tag-small">
                {tag}
              </span>
            ))}
          </div>
        </header>

        {loading ? (
          <p className="post-loading">正文加载中…</p>
        ) : (
          <MarkdownBody html={html} onClick={handleContentClick} />
        )}

        <ShareBar
          title={post.title}
          path={`/post/${slug}`}
          date={post.date}
          minutes={post.minutes}
          tags={post.tags}
          cover={post.cover}
          excerpt={post.excerpt || excerptFromMarkdown(content)}
          outline={toc.map((item) => item.text)}
        />

        {related.length > 0 && (
          <section className="post-related" aria-label="相关文章">
            <p className="post-related-title">相关文章</p>
            <ul className="post-related-list">
              {related.map((item) => (
                <li key={item.slug}>
                  <Link to={`/post/${item.slug}`}>{item.title}</Link>
                  <span className="post-related-meta">
                    {formatDate(item.date)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <nav className="post-adjacent">
          {next ? (
            <Link to={`/post/${next.slug}`} className="adjacent-link">
              <span className="adjacent-label">← 较新一篇</span>
              <span className="adjacent-title">{next.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {prev && (
            <Link
              to={`/post/${prev.slug}`}
              className="adjacent-link adjacent-right"
            >
              <span className="adjacent-label">较早一篇 →</span>
              <span className="adjacent-title">{prev.title}</span>
            </Link>
          )}
        </nav>
      </div>
    </article>
  );
}
