import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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
  'lightning',
  'coin',
  'cat',
  'mushroom',
]

function getPostIcon(slug: string): PixelIconName {
  let hash = 0

  for (let index = 0; index < slug.length; index += 1) {
    hash = (hash * 31 + slug.charCodeAt(index)) >>> 0
  }

  return postIcons[hash % postIcons.length]
}

export default function Home() {
  const [activeTag, setActiveTag] = useState('')

  const allTags = useMemo(() => [...new Set(posts.flatMap((p) => p.tags))], [])
  const filtered = activeTag
    ? posts.filter((p) => p.tags.includes(activeTag))
    : posts

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
              onClick={() => setActiveTag('')}
            >
              全部 ({posts.length})
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                className={activeTag === tag ? 'tag tag-active' : 'tag'}
                onClick={() => setActiveTag(activeTag === tag ? '' : tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        <section className="post-list">
          {filtered.map((post) => (
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
      </div>
    </div>
  )
}
