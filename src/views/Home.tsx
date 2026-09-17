import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PixelIcon, type PixelIconName } from '../components/PixelIcon'
import PlayerCard from '../components/PlayerCard'
import { posts } from '../data/posts'
import { site } from '../data/site'

function formatDate(date: string): string {
  if (!date) return ''
  const [y, m, d] = date.split('-')
  return `${y} 年 ${Number(m)} 月 ${Number(d)} 日`
}

const postIcons: PixelIconName[] = [
  'star',
  'rocket',
  'smile',
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

export default function Home() {
  const [activeTag, setActiveTag] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()

  const allTags = useMemo(() => [...new Set(posts.flatMap((p) => p.tags))], [])
  const filtered = activeTag
    ? posts.filter((p) => p.tags.includes(activeTag))
    : posts

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(Math.max(1, Number(searchParams.get('page')) || 1), totalPages)
  const visiblePosts = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const selectTag = (tag: string) => {
    setActiveTag(tag)
    setSearchParams({}, { replace: true })
  }

  const goToPage = (next: number) => {
    setSearchParams(next === 1 ? {} : { page: String(next) })
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

        {allTags.length > 0 && (
          <div className="tag-filter">
            <button
              className={activeTag === '' ? 'tag tag-active' : 'tag'}
              onClick={() => selectTag('')}
            >
              全部 ({posts.length})
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                className={activeTag === tag ? 'tag tag-active' : 'tag'}
                onClick={() => selectTag(tag)}
              >
                {tag}
              </button>
            ))}
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
