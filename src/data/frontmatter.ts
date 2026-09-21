// frontmatter 解析:纯字符串处理,构建期(vite 插件扫描文章)与运行时
// (渲染前去掉正文顶部的元信息)共用同一份实现,避免两处规则跑偏。

export interface PostMeta {
  title?: string;
  date?: string;
  /** 最后更新日期(可选):和 date 不同天才在文章页显示「更新于」 */
  updated?: string;
  tags?: string[];
  categories?: string[];
  excerpt?: string;
  cover?: string;
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function parseFrontmatter(raw: string): {
  meta: PostMeta;
  content: string;
} {
  const match = raw.match(FRONTMATTER);
  if (!match) return { meta: {}, content: raw };

  const meta: PostMeta = {};
  let listKey: 'tags' | 'categories' | null = null;

  for (const line of match[1].split(/\r?\n/)) {
    const item = line.match(/^\s*-\s+(.+)$/);
    if (item) {
      if (listKey === 'tags') meta.tags?.push(item[1].trim());
      if (listKey === 'categories') meta.categories?.push(item[1].trim());
      continue;
    }

    const idx = line.indexOf(':');
    if (idx === -1) continue;
    listKey = null;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();

    if (key === 'tags' || key === 'categories') {
      meta[key] = value
        ? value
            .split(/[,，]/)
            .map((entry) => entry.trim())
            .filter(Boolean)
        : [];
      listKey = key;
    } else if (key === 'title') {
      meta.title = value;
    } else if (key === 'date') {
      meta.date = value;
    } else if (key === 'updated') {
      meta.updated = value;
    } else if (key === 'excerpt') {
      meta.excerpt = value;
    } else if (key === 'cover') {
      meta.cover = value;
    }
  }

  return { meta, content: raw.slice(match[0].length) };
}

// 估算正文规模:中日韩字符按字算,其余按空白切词;阅读时长按 400 字/分钟估
export function countWords(text: string): number {
  const cjk = text.match(
    /[\u3400-\u4dbf\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g,
  );
  const latin = text.replace(
    /[\u3400-\u4dbf\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g,
    ' ',
  );
  const words = latin.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w));
  return (cjk?.length ?? 0) + words.length;
}
