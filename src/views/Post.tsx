import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { renderMarkdown } from '../data/markdown'
import { adjacentPosts, getPostBySlug } from '../data/posts'

function formatDate(date: string): string {
  if (!date) return ''
  const [y, m, d] = date.split(' ')[0].split('-')
  if (!m) return y
  const day = d ? ` ${Number(d)} 日` : ''
  return `${y} 年 ${Number(m)} 月${day}`
}

type TocItem = { id: string; text: string; level: 2 | 3 }

// 从 Markdown 源码里提取二、三级标题作为目录项,并生成对应顺序的 id 列表
function buildToc(content: string): { toc: TocItem[]; ids: string[] } {
  const toc: TocItem[] = []
  const ids: string[] = []
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^(#{2,3})\s+(.+?)\s*#*$/)
    if (!match) continue
    const id = `toc-${ids.length}`
    ids.push(id)
    toc.push({
      id,
      text: match[2].replace(/[`*]/g, ''),
      level: match[1].length as 2 | 3,
    })
  }
  return { toc, ids }
}

// 按出现顺序给渲染结果里的 h2/h3 注入同样的 id
function injectHeadingIds(html: string, ids: string[]): string {
  let index = 0
  return html.replace(/<h([23])>/g, (match, level: string) => {
    const id = ids[index++]
    return id ? `<h${level} id="${id}">` : match
  })
}

export default function Post() {
  const slug = useParams()['*']
  const post = getPostBySlug(slug ?? '')
  const { prev, next } = adjacentPosts(slug ?? '')

  if (!post) {
    return (
      <section className="empty-block">
        <p className="game-over pixel-en blink">GAME OVER</p>
        <p className="empty">文章不存在,可能已被删除或链接有误。</p>
        <Link to="/" className="back-home">
          ← 返回首页
        </Link>
      </section>
    )
  }

  // 内容是仓库内自己写的 Markdown,来源可控
  const { html, toc } = useMemo(() => {
    const { toc, ids } = buildToc(post.content)
    return {
      html: injectHeadingIds(renderMarkdown(post.content), ids),
      toc,
    }
  }, [post])

  const [activeId, setActiveId] = useState('')

  useEffect(() => {
    if (toc.length === 0) return
    const onScroll = () => {
      let current = ''
      for (const item of toc) {
        const el = document.getElementById(item.id)
        if (el && el.getBoundingClientRect().top <= 120) current = item.id
      }
      setActiveId(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [toc])

  const jumpTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <article className="post">
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
                      event.preventDefault()
                      jumpTo(item.id)
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

      <div className="post-body">
        <header className="post-header">
        <h1 className="post-title">{post.title}</h1>
        <div className="post-meta">
          <time>{formatDate(post.date)}</time>
          {post.tags.map((tag) => (
            <span key={tag} className="tag tag-small">
              {tag}
            </span>
          ))}
        </div>
      </header>

      <div
        className="post-content markdown-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />

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
          <Link to={`/post/${prev.slug}`} className="adjacent-link adjacent-right">
            <span className="adjacent-label">较早一篇 →</span>
            <span className="adjacent-title">{prev.title}</span>
          </Link>
        )}
        </nav>
      </div>
    </article>
  )
}
