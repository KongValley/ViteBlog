// 文章数据源:自动扫描 src/posts/ 及其子目录下的所有 .md 文件
// 新建一篇文章 = 在 src/posts/ 里新建一个 .md 文件,无需改任何代码
import postTimes from 'virtual:post-times'

export interface Post {
  slug: string
  title: string
  date: string
  tags: string[]
  excerpt: string
  content: string
  /** md 文件的创建时间(首次提交进仓库的时间,毫秒时间戳),用于列表排序 */
  createdAt: number
}

interface PostMeta {
  title?: string
  date?: string
  tags?: string[]
  excerpt?: string
}

const modules = import.meta.glob('../posts/**/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

// 解析文件顶部的 frontmatter(--- 包裹的 key: value 元信息)
function parseFrontmatter(raw: string): { meta: PostMeta; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  const meta: PostMeta = {}
  let content = raw
  if (match) {
    for (const line of match[1].split(/\r?\n/)) {
      const idx = line.indexOf(':')
      if (idx === -1) continue
      const key = line.slice(0, idx).trim()
      const value = line.slice(idx + 1).trim()
      if (key === 'tags') {
        meta.tags = value.split(/[,，]/).map((t) => t.trim()).filter(Boolean)
      } else if (key === 'title') {
        meta.title = value
      } else if (key === 'date') {
        meta.date = value
      } else if (key === 'excerpt') {
        meta.excerpt = value
      }
    }
    content = raw.slice(match[0].length)
  }
  return { meta, content }
}

export const posts: Post[] = Object.entries(modules)
  .map(([path, raw]) => {
    const { meta, content } = parseFrontmatter(raw)
    const slug = path.replace(/^\.\.\/posts\//, '').replace(/\.md$/, '')
    return {
      slug,
      title: meta.title ?? '未命名文章',
      date: meta.date ?? '',
      tags: meta.tags ?? [],
      excerpt: meta.excerpt ?? '',
      content,
      createdAt: postTimes[`${slug}.md`] ?? 0,
    }
  })
  // 按文章文件的创建时间倒序(最新写的在最前);
  // 同一时刻创建时,再按 frontmatter 的 date、slug 依次兜底
  .sort(
    (a, b) =>
      b.createdAt - a.createdAt ||
      (a.date < b.date ? 1 : a.date > b.date ? -1 : 0) ||
      (a.slug < b.slug ? -1 : 1),
  )

export function getPostBySlug(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug)
}

// 按发布顺序返回相邻文章,用于文章页底部的"上一篇 / 下一篇"
export function adjacentPosts(slug: string): { prev: Post | null; next: Post | null } {
  const index = posts.findIndex((p) => p.slug === slug)
  return {
    prev: posts[index + 1] ?? null,
    next: posts[index - 1] ?? null,
  }
}
