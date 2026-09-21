import { Link, useParams } from 'react-router-dom';
import '../components/Archive.css';
import { formatDate } from '../data/format';
import { usePageMeta } from '../data/pageMeta';
import { postsByCategory } from '../data/posts';

// 分类详情:列出该分类下的全部文章(标题 + 日期 + 标签 + 摘要)。
// 路由是 /categories/:name,分类名里的空格等由 Link 侧 encodeURIComponent,
// react-router 取出时已经解码过,这里直接用。
export default function Category() {
  const { name = '' } = useParams<{ name: string }>();
  const list = postsByCategory(name);
  const found = list.length > 0;

  usePageMeta({
    title: found ? `${name} · 分类` : `未找到分类 ${name}`,
    description: found
      ? `分类「${name}」下的 ${list.length} 篇文章。`
      : `站点里没有叫「${name}」的分类,可以回到分类总览重新挑一个。`,
    path: `/categories/${encodeURIComponent(name)}`,
  });

  return (
    <section className="archive-page">
      <Link className="archive-back" to="/categories">
        ← 全部分类
      </Link>

      <header className="archive-head">
        <h1 className="archive-title">{found ? name : '分类不存在'}</h1>
        <p className="archive-sub">
          {found ? (
            <>
              共 <b className="archive-count">{list.length}</b> 篇文章
            </>
          ) : (
            '这个分类没有落到纸面上'
          )}
        </p>
      </header>

      {found ? (
        <ul className="archive-list">
          {list.map((post) => (
            <li key={post.slug} className="archive-item">
              <h2 className="archive-item-title">
                <Link to={`/post/${post.slug}`}>{post.title}</Link>
              </h2>

              <p className="archive-item-meta">
                <time dateTime={post.date}>{formatDate(post.date)}</time>
                <span>·</span>
                <span>{post.minutes} 分钟</span>
              </p>

              {post.tags.length > 0 && (
                <ul className="archive-tags">
                  {post.tags.map((tag) => (
                    <li key={tag}>
                      <Link
                        className="archive-tag"
                        to={`/?tag=${encodeURIComponent(tag)}`}
                      >
                        {tag}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {post.excerpt && (
                <p className="archive-item-excerpt">{post.excerpt}</p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="archive-empty">
          没有找到分类「{name}」,或许它还没被写下。
          <Link className="archive-back archive-empty-back" to="/categories">
            ← 回到全部分类
          </Link>
        </p>
      )}
    </section>
  );
}
