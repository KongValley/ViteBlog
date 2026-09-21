import {
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import '../components/Search.css';
import './Search.css';
import { formatDate } from '../data/format';
import { usePageMeta } from '../data/pageMeta';
import { allTags, type Post, posts } from '../data/posts';

// 命中权重:标题 > 标签/分类 > 摘要 > 正文。四个档位拉开距离,
// 让"标题里出现过关键词"的文章稳定排在"只是正文里提了一嘴"的前面。
const TITLE_WEIGHT = 8;
const FACET_WEIGHT = 4;
const EXCERPT_WEIGHT = 2;
const BODY_WEIGHT = 1;

/** 正文命中片段:以命中处为中心,前后各留这么多字 */
const SNIPPET_RADIUS = 20;

// 空查询状态下露出的热门标签数量(标签本身也是搜索入口)
const HOT_TAG_LIMIT = 10;

// 全文索引的地址:public/search-index.json,由 scripts/build-search-index.mjs 构建期产出。
// 带 BASE_URL —— GitHub Pages 部署在子路径下,写死 /search-index.json 会 404。
const INDEX_URL = `${import.meta.env.BASE_URL}search-index.json`;

/** 打分只读这几个字段:内存里的 Post 和索引条目都满足这个形状 */
interface SearchFields {
  title: string;
  tags: string[];
  categories: string[];
  excerpt: string;
}

/** public/search-index.json 里的一篇文章(正文是压好的纯文本) */
interface IndexEntry extends SearchFields {
  slug: string;
  date: string;
  text: string;
}

/** 片段里的一段:命中词(带高亮用的位置)还是普通文字 */
type SnippetPart =
  | { text: string; hit: false }
  | { text: string; hit: true; at: number };

/** 一条结果:文章元信息 + 正文命中时切出来的片段(没有就退回显示摘要) */
interface Hit {
  post: Post;
  snippet: SnippetPart[] | null;
}

/** 单个关键词在一篇文章上的得分(大小写不敏感,中文直接按子串命中) */
function scoreTerm(fields: SearchFields, term: string): number {
  let score = 0;
  if (fields.title.toLowerCase().includes(term)) score += TITLE_WEIGHT;
  const facetHit =
    fields.tags.some((tag) => tag.toLowerCase().includes(term)) ||
    fields.categories.some((category) => category.toLowerCase().includes(term));
  if (facetHit) score += FACET_WEIGHT;
  if (fields.excerpt.toLowerCase().includes(term)) score += EXCERPT_WEIGHT;
  return score;
}

/**
 * 切出正文里的命中片段:以 at 处的命中词为中心取前后各 SNIPPET_RADIUS 字,
 * 窗口里所有关键词都包成高亮段 —— 一眼就能看出这篇为什么被搜到。
 * lower 是 text 的小写副本,两者下标一一对应。
 */
function buildSnippet(
  text: string,
  lower: string,
  at: number,
  length: number,
  terms: string[],
): SnippetPart[] {
  const start = Math.max(0, at - SNIPPET_RADIUS);
  const end = Math.min(text.length, at + length + SNIPPET_RADIUS);
  const raw = text.slice(start, end);
  const window = lower.slice(start, end);
  const parts: SnippetPart[] = [];
  let cursor = 0;
  let index = 0;
  while (index < raw.length) {
    const term = terms.find((candidate) => window.startsWith(candidate, index));
    if (!term) {
      index += 1;
      continue;
    }
    if (index > cursor) {
      parts.push({ text: raw.slice(cursor, index), hit: false });
    }
    // at 是高亮段在片段里的起点:渲染时拿它当 key,不用数组下标
    parts.push({
      text: raw.slice(index, index + term.length),
      hit: true,
      at: index,
    });
    cursor = index + term.length;
    index = cursor;
  }
  if (cursor < raw.length) parts.push({ text: raw.slice(cursor), hit: false });

  // 两端可能是被切了一半的空白,顺手抹掉;真的截断了一侧才补省略号,
  // 免得读者以为原文就是这么起的头
  const first = parts[0];
  if (first && !first.hit) first.text = first.text.replace(/^\s+/, '');
  const last = parts[parts.length - 1];
  if (last && !last.hit) last.text = last.text.replace(/\s+$/, '');
  if (start > 0) parts.unshift({ text: '…', hit: false });
  if (end < text.length) parts.push({ text: '…', hit: false });
  return parts.filter((part) => part.text.length > 0);
}

/** 结果里那句说明文字:正文命中用片段,否则退回摘要 */
function renderSnippet(hit: Hit) {
  const parts: SnippetPart[] =
    hit.snippet && hit.snippet.length > 0
      ? hit.snippet
      : hit.post.excerpt
        ? [{ text: hit.post.excerpt, hit: false }]
        : [];
  if (parts.length === 0) return null;
  return (
    <p className="search-hit-excerpt">
      {parts.map((part) =>
        part.hit ? (
          <mark key={part.at} className="search-hit-mark">
            {part.text}
          </mark>
        ) : (
          part.text
        ),
      )}
    </p>
  );
}

export default function Search() {
  usePageMeta({
    title: '搜索',
    description: '站内文章搜索',
    path: '/search',
  });

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  // 输入框用自己的 state:打字要立刻回显,URL 只是顺带同步的"可分享副本"
  const [text, setText] = useState(() => query);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // 自己每次写 URL 都把值排进队列;URL 变化时先拿它 FIFO 追平,
  // 追不上才当成外部导航(前进/后退、别处跳进来)去回填输入框。
  // 不能只比"最后一次写入":渲染落后于输入时 URL 里还是旧值,
  // 回填会把用户刚敲的字抹掉(实测会丢字符)。
  const writesRef = useRef<string[]>([]);
  // 全文索引:进搜索页才拉(51 篇纯文本约 115 KB,没必要压进首屏 bundle)。
  // 拿不到就一直是 null,打分自动退回元信息那一套 —— 索引挂了也得能搜标题。
  const [index, setIndex] = useState<IndexEntry[] | null>(null);
  const [indexFailed, setIndexFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(INDEX_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`索引请求失败:${response.status}`);
        return response.json() as Promise<{ posts?: IndexEntry[] }>;
      })
      .then((data) => {
        if (!alive) return;
        if (Array.isArray(data.posts)) setIndex(data.posts);
        else setIndexFailed(true);
      })
      .catch(() => {
        if (alive) setIndexFailed(true);
      });
    // 组件卸载后别再去 setState(dev 下 StrictMode 会跑两遍)
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    // 关键词一变,高亮归位,免得指向已经不在列表里的下标
    setActive(-1);
    const pending = writesRef.current;
    if (pending.length > 0) {
      const index = pending.indexOf(query);
      if (index >= 0) {
        pending.splice(0, index + 1);
        return;
      }
      pending.length = 0;
    }
    setText(query);
  }, [query]);

  const terms = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized ? normalized.split(/\s+/) : [];
  }, [query]);

  // slug → 索引条目 + 预先小写好的正文。每次按键都要在正文里找子串,
  // 别把 51 篇的大小写转换也塞进这个循环。
  const indexBySlug = useMemo(() => {
    if (!index) return null;
    const map = new Map<string, { entry: IndexEntry; lower: string }>();
    for (const entry of index) {
      map.set(entry.slug, { entry, lower: entry.text.toLowerCase() });
    }
    return map;
  }, [index]);

  const results = useMemo<Hit[]>(() => {
    // 空查询:posts 本身已是 date 倒序,直接原样展示
    if (terms.length === 0)
      return posts.map((post) => ({ post, snippet: null }));

    const scored: {
      post: Post;
      score: number;
      snippet: SnippetPart[] | null;
    }[] = [];
    for (const post of posts) {
      const indexed = indexBySlug?.get(post.slug) ?? null;
      // 索引在就用索引里的字段打分(两边同源,都是 frontmatter),正文也才有得搜
      const fields: SearchFields = indexed?.entry ?? post;
      let score = 0;
      let snippet: SnippetPart[] | null = null;
      // 多词:一个词没着落(标题/标签/摘要/正文全不沾)整篇就不算命中
      let allHit = true;
      for (const term of terms) {
        let termScore = scoreTerm(fields, term);
        if (indexed) {
          const at = indexed.lower.indexOf(term);
          if (at >= 0) {
            termScore += BODY_WEIGHT;
            // 片段只切一次:正文里第一个命中的关键词说了算,
            // 其余关键词落在窗口里的话会一起高亮
            snippet ??= buildSnippet(
              indexed.entry.text,
              indexed.lower,
              at,
              term.length,
              terms,
            );
          }
        }
        if (termScore === 0) {
          allHit = false;
          break;
        }
        score += termScore;
      }
      if (allHit) scored.push({ post, score, snippet });
    }
    // 同分时保持原顺序(posts 是 date 倒序),所以只按分数排就够
    scored.sort((a, b) => b.score - a.score);
    return scored.map(({ post, snippet }) => ({ post, snippet }));
  }, [indexBySlug, terms]);

  const hotTags = useMemo(() => allTags().slice(0, HOT_TAG_LIMIT), []);

  // 进搜索页就直接能打字,省掉"先点一下输入框"这一步
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 高亮项滚进可视区(键盘移动时不要跑到屏幕外)
  useEffect(() => {
    if (active < 0) return;
    const item = listRef.current?.children[active] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const changeQuery = (next: string) => {
    const value = next.trim();
    writesRef.current.push(value);
    setText(next);
    setSearchParams(value ? { q: value } : {}, { replace: true });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      changeQuery('');
      return;
    }
    if (event.key === 'ArrowDown' && results.length > 0) {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, results.length - 1));
      return;
    }
    if (event.key === 'ArrowUp' && results.length > 0) {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, -1));
      return;
    }
    if (event.key === 'Enter') {
      // 没手动高亮时,回车直接进第一条 —— 和搜索结果页的直觉一致
      const target = results[active >= 0 ? active : 0];
      if (target) navigate(`/post/${target.post.slug}`);
    }
  };

  const trimmed = query.trim();
  // 索引没到位(也没失败)的这段时间,正文还搜不了,得让用户知道在等什么
  const loadingIndex = index === null && !indexFailed;

  return (
    <div className="search-page">
      <h2 className="search-title">搜索</h2>

      <div className="search-box">
        <span className="search-box-icon" aria-hidden="true">
          {/* 放大镜用内联 SVG,不用 ⌕ 这类字符:那个字形依赖字体,
              Fira Code 里没有,浏览器回退出来的符号只有 9px 宽,在 46px 高的输入框里显得很小 */}
          <svg
            viewBox="0 0 20 20"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="M12.8 12.8 17 17" />
          </svg>
        </span>
        <input
          ref={inputRef}
          className="search-input"
          type="search"
          value={text}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          aria-label="搜索文章"
          placeholder="搜索标题、标签、分类或正文…"
          onChange={(event) => changeQuery(event.target.value)}
          onKeyDown={onKeyDown}
        />
        {text.length > 0 && (
          <button
            type="button"
            className="search-clear"
            aria-label="清空搜索"
            title="清空(Esc)"
            onClick={() => {
              changeQuery('');
              inputRef.current?.focus();
            }}
          >
            ×
          </button>
        )}
      </div>

      <p className="search-hint">
        支持多个关键词(空格分隔)· ↑ ↓ 选择、Enter 打开、Esc 清空
      </p>

      {loadingIndex && <p className="search-loading">正在加载索引…</p>}

      {terms.length === 0 && hotTags.length > 0 && (
        <div className="search-hot">
          <span className="search-hot-label">热门标签</span>
          {hotTags.map((tag) => (
            <button
              key={tag.name}
              type="button"
              className="search-hot-tag"
              onClick={() => changeQuery(tag.name)}
            >
              {tag.name}
              <span className="search-hot-count">{tag.count}</span>
            </button>
          ))}
        </div>
      )}

      <p className="search-count" aria-live="polite">
        {trimmed
          ? `「${trimmed}」命中 ${results.length} 篇文章`
          : `共 ${results.length} 篇文章`}
      </p>

      {results.length === 0 ? (
        <p className="search-empty">
          没有找到和「{trimmed}」有关的文章,换个关键词试试?
        </p>
      ) : (
        <ul className="search-results" ref={listRef}>
          {results.map((hit, index) => (
            <li key={hit.post.slug}>
              <Link
                to={`/post/${hit.post.slug}`}
                className={
                  index === active
                    ? 'search-hit search-hit--active'
                    : 'search-hit'
                }
                aria-current={index === active ? 'true' : undefined}
                onMouseEnter={() => setActive(index)}
              >
                <h3 className="search-hit-title">{hit.post.title}</h3>
                <p className="search-hit-meta">
                  <time dateTime={hit.post.date}>
                    {formatDate(hit.post.date)}
                  </time>
                  <span className="search-hit-sep">·</span>
                  <span>{hit.post.minutes} 分钟</span>
                </p>
                {hit.post.tags.length > 0 && (
                  <p className="search-hit-tags">
                    {hit.post.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="tag search-hit-tag">
                        {tag}
                      </span>
                    ))}
                  </p>
                )}
                {renderSnippet(hit)}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
