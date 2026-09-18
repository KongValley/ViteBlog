import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PixelIcon, type PixelIconName } from '../components/PixelIcon'
import PlayerCard from '../components/PlayerCard'
import { posts } from '../data/posts'
import { site } from '../data/site'
import { stickerIcons } from '../data/stickerIcons'

function formatDate(date: string): string {
  if (!date) return ''
  const [y, m, d] = date.split(' ')[0].split('-')
  if (!m) return y
  const day = d ? ` ${Number(d)} 日` : ''
  return `${y} 年 ${Number(m)} 月${day}`
}

const postIcons: PixelIconName[] = [
  'star',
  'rocket',
  'smile',
  'wink',
  'laugh',
  'surprised',
  'love',
  'heart',
  'ghost',
  'gamepad',
  'cat',
  'mushroom',
  'hero',
  'wizard',
  'ninja',
  'knight',
  'robot',
  'slime',
  'invader',
  'fighter',
  'sword',
  'shield',
  'potion',
  'bomb',
  'chest',
  'key',
  'gem',
  'joystick',
  'portal',
  'trophy',
  ...stickerIcons,
]

// 个别文章手动指定图标,覆盖哈希随机分配的结果
const iconOverrides: Record<string, PixelIconName> = {
  'typescript/typescript-webpack': 'shield',
  'tool/自用代码提交格式': 'invader',
  'tool/Hexo引入mermaid': 'robot',
  'tool/Hexo外链播放器': 'cat',
  'typescript/typescript入门': 'wizard',
}

function getPostIcon(slug: string): PixelIconName {
  const override = iconOverrides[slug]
  if (override) return override

  let hash = 0

  for (let index = 0; index < slug.length; index += 1) {
    hash = (hash * 31 + slug.charCodeAt(index)) >>> 0
  }

  return postIcons[hash % postIcons.length]
}

const PAGE_SIZE = 10
const MAX_HOME_TAGS = 10

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams()
  // 标签筛选放在 URL 参数里,标签总览页可以带 ?tag= 直达某个筛选结果
  const activeTag = searchParams.get('tag') ?? ''

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const post of posts) {
      for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
    return counts
  }, [])
  // 标签按文章数从多到少排,首页只露出常用的一批,其余进标签总览页
  const sortedTags = useMemo(
    () =>
      [...tagCounts.keys()].sort(
        (a, b) => (tagCounts.get(b) ?? 0) - (tagCounts.get(a) ?? 0) || (a < b ? -1 : 1),
      ),
    [tagCounts],
  )
  const visibleTags = useMemo(() => {
    const top = sortedTags.slice(0, MAX_HOME_TAGS)
    if (activeTag && !top.includes(activeTag)) top.push(activeTag)
    return top
  }, [sortedTags, activeTag])

  const filtered = activeTag
    ? posts.filter((p) => p.tags.includes(activeTag))
    : posts

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(Math.max(1, Number(searchParams.get('page')) || 1), totalPages)
  const visiblePosts = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const selectTag = (tag: string) => {
    // 换标签时重置回第一页
    setSearchParams(tag ? { tag } : {}, { replace: true })
  }

  const goToPage = (next: number) => {
    const params: Record<string, string> = {}
    if (activeTag) params.tag = activeTag
    if (next !== 1) params.page = String(next)
    setSearchParams(params)
    window.scrollTo(0, 0)
  }

  return (
    <div className="home-layout">
      <PlayerCard />

      <div className="home-main">
        <section className="hero">
          <h1 className="hero-title">{site.name}</h1>
          <p className="hero-tagline">{site.tagline} — 基于 React + Vite 构建</p>
          <p className="hero-press pixel-en blink">★ PRESS START TO READ ★</p>
        </section>

        {sortedTags.length > 0 && (
          <div className="tag-filter">
            <button
              className={activeTag === '' ? 'tag tag-active' : 'tag'}
              onClick={() => selectTag('')}
            >
              全部 ({posts.length})
            </button>
            {visibleTags.map((tag) => (
              <button
                key={tag}
                className={activeTag === tag ? 'tag tag-active' : 'tag'}
                onClick={() => selectTag(tag)}
              >
                {tag}
              </button>
            ))}
            <Link to="/tags" className="tag tag-more" title="查看全部标签">
              …
            </Link>
          </div>
        )}

        <section className="post-list">
          {visiblePosts.map((post) => (
            <article key={post.slug} className="post-card">
              <Link to={`/post/${post.slug}`} className="post-card-link">
                <h2 className="post-card-title">
                  <span className="post-card-icon" aria-hidden="true">
                    <PixelIcon name={getPostIcon(post.slug)} />
                  </span>
                  {post.title}
                </h2>
                <p className="post-card-excerpt">{post.excerpt}</p>
                <div className="post-card-meta">
                  <time className="post-card-date">{formatDate(post.date)}</time>
                  {post.tags.map((tag) => (
                    <span key={tag} className="tag tag-small">
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
            </article>
          ))}

          {filtered.length === 0 && <p className="empty">这个标签下还没有文章~</p>}
        </section>

        {totalPages > 1 && (
          <nav className="pagination" aria-label="文章分页">
            <button
              className="page-btn"
              disabled={page === 1}
              onClick={() => goToPage(page - 1)}
            >
              ◀ 上一页
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                className={num === page ? 'page-btn page-current' : 'page-btn'}
                onClick={() => goToPage(num)}
              >
                {num}
              </button>
            ))}
            <button
              className="page-btn"
              disabled={page === totalPages}
              onClick={() => goToPage(page + 1)}
            >
              下一页 ▶
            </button>
          </nav>
        )}
      </div>
    </div>
  )
}
