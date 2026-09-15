// 文章数据源:自动扫描 src/posts/ 及其子目录下的所有 .md 文件
// 新建一篇文章 = 在 src/posts/ 里新建一个 .md 文件,无需改任何代码

export interface Post {
  slug: string
  title: string
  date: string
  tags: string[]
  categories: string[]
  excerpt: string
  content: string
}

interface PostMeta {
  title?: string
  date?: string
  tags?: string[]
  categories?: string[]
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
    type ListKey = 'tags' | 'categories'
    let currentList: ListKey | null = null
    for (const line of match[1].split(/\r?\n/)) {
      const listItem = line.match(/^\s*-\s+(.+)$/)
      if (listItem) {
        if (currentList === 'tags') meta.tags?.push(listItem[1].trim())
        if (currentList === 'categories') meta.categories?.push(listItem[1].trim())
        continue
      }

      const idx = line.indexOf(':')
      if (idx === -1) continue
      currentList = null
      const key = line.slice(0, idx).trim()
      const value = line.slice(idx + 1).trim()
      if (key === 'tags' || key === 'categories') {
        const values = value
          ? value.split(/[,，]/).map((item) => item.trim()).filter(Boolean)
          : []
        meta[key] = values
        currentList = key
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
      categories: meta.categories ?? [],
      excerpt: meta.excerpt ?? '',
      content,
    }
  })
  // 按 frontmatter 的 date 倒序(最新发布在最前),slug 仅用于稳定排序
  .sort(
    (a, b) =>
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
