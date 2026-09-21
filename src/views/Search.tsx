import {
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import '../components/Search.css';
import { formatDate } from '../data/format';
import { usePageMeta } from '../data/pageMeta';
import { allTags, type Post, posts } from '../data/posts';

// 命中权重:标题 > 标签/分类 > 摘要。三个档位拉开距离,
// 让"标题里出现过关键词"的文章稳定排在"只是摘要里提了一嘴"的前面。
const TITLE_WEIGHT = 8;
const FACET_WEIGHT = 4;
const EXCERPT_WEIGHT = 2;

// 空查询状态下露出的热门标签数量(标签本身也是搜索入口)
const HOT_TAG_LIMIT = 10;

/** 单个关键词在一篇文章上的得分(大小写不敏感,中文直接按子串命中) */
function scoreTerm(post: Post, term: string): number {
  let score = 0;
  if (post.title.toLowerCase().includes(term)) score += TITLE_WEIGHT;
  const facetHit =
    post.tags.some((tag) => tag.toLowerCase().includes(term)) ||
    post.categories.some((category) => category.toLowerCase().includes(term));
  if (facetHit) score += FACET_WEIGHT;
  if (post.excerpt.toLowerCase().includes(term)) score += EXCERPT_WEIGHT;
  return score;
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

  const results = useMemo(() => {
    // 空查询:posts 本身已是 date 倒序,直接原样展示
    if (terms.length === 0) return posts;
    const scored = posts
      .map((post) => ({
        post,
        score: terms.reduce((sum, term) => sum + scoreTerm(post, term), 0),
      }))
      .filter((hit) => hit.score > 0);
    // 同分时保持原顺序(posts 是 date 倒序),所以只按分数排就够
    scored.sort((a, b) => b.score - a.score);
    return scored.map((hit) => hit.post);
  }, [terms]);

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
      if (target) navigate(`/post/${target.slug}`);
    }
  };

  const trimmed = query.trim();

  return (
    <div className="search-page">
      <h2 className="search-title">搜索</h2>

      <div className="search-box">
        <span className="search-box-icon" aria-hidden="true">
          ⌕
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
          placeholder="搜索标题、标签、分类或摘要…"
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
          {results.map((post, index) => (
            <li key={post.slug}>
              <Link
                to={`/post/${post.slug}`}
                className={
                  index === active
                    ? 'search-hit search-hit--active'
                    : 'search-hit'
                }
                aria-current={index === active ? 'true' : undefined}
                onMouseEnter={() => setActive(index)}
              >
                <h3 className="search-hit-title">{post.title}</h3>
                <p className="search-hit-meta">
                  <time dateTime={post.date}>{formatDate(post.date)}</time>
                  <span className="search-hit-sep">·</span>
                  <span>{post.minutes} 分钟</span>
                </p>
                {post.tags.length > 0 && (
                  <p className="search-hit-tags">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="tag search-hit-tag">
                        {tag}
                      </span>
                    ))}
                  </p>
                )}
                {post.excerpt && (
                  <p className="search-hit-excerpt">{post.excerpt}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
