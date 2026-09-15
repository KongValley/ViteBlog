import { Link, useParams } from 'react-router-dom'
import { renderMarkdown } from '../data/markdown'
import { adjacentPosts, getPostBySlug } from '../data/posts'

function formatDate(date: string): string {
  if (!date) return ''
  const [y, m, d] = date.split('-')
  return `${y} 年 ${Number(m)} 月 ${Number(d)} 日`
}

export default function Post() {
  const { slug } = useParams()
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
  const html = renderMarkdown(post.content)

  return (
    <article className="post">
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
    </article>
  )
}
