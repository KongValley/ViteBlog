// 文章数据源:自动扫描 src/posts/ 下的所有 .md 文件
// 新建一篇文章 = 在 src/posts/ 里新建一个 .md 文件,无需改任何代码
const modules = import.meta.glob('../posts/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
})

// 解析文件顶部的 frontmatter(--- 包裹的 key: value 元信息)
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  const meta = {}
  let content = raw
  if (match) {
    for (const line of match[1].split(/\r?\n/)) {
      const idx = line.indexOf(':')
      if (idx === -1) continue
      const key = line.slice(0, idx).trim()
      const value = line.slice(idx + 1).trim()
      if (key === 'tags') {
        meta.tags = value.split(/[,，]/).map((t) => t.trim()).filter(Boolean)
      } else {
        meta[key] = value
      }
    }
    content = raw.slice(match[0].length)
  }
  return { meta, content }
}

export const posts = Object.entries(modules)
  .map(([path, raw]) => {
    const { meta, content } = parseFrontmatter(raw)
    const slug = path.split('/').pop().replace(/\.md$/, '')
    return {
      slug,
      title: meta.title ?? '未命名文章',
      date: meta.date ?? '',
      tags: meta.tags ?? [],
      excerpt: meta.excerpt ?? '',
      content,
    }
  })
  // 按日期倒序,最新的在最前面(日期用 YYYY-MM-DD 格式即可正确排序)
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

export function getPostBySlug(slug) {
  return posts.find((p) => p.slug === slug)
}

// 按发布顺序返回相邻文章,用于文章页底部的"上一篇 / 下一篇"
export function adjacentPosts(slug) {
  const index = posts.findIndex((p) => p.slug === slug)
  return {
    prev: posts[index + 1] ?? null,
    next: posts[index - 1] ?? null,
  }
}
