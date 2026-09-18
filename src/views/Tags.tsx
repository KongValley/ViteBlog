import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { posts } from '../data/posts'

// 标签总览页:展示全部标签及各自的文章数量,点击回到首页并套用筛选
export default function Tags() {
  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const post of posts) {
      for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
    return [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1),
    )
  }, [])

  return (
    <div className="tags-page">
      <h2 className="section-title">全部标签</h2>
      <p className="tags-summary">
        共 {tagCounts.length} 个标签 · {posts.length} 篇文章 · 点击标签查看对应文章
      </p>
      <div className="tag-cloud">
        {tagCounts.map(([tag, count]) => (
          <Link
            key={tag}
            to={`/?tag=${encodeURIComponent(tag)}`}
            className="tag tag-cloud-item"
          >
            {tag}
            <span className="tag-count">{count}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
