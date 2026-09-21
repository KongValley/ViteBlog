import { Link } from 'react-router-dom';
import '../components/NotFound.css';
import { formatDate } from '../data/format';
import { usePageMeta } from '../data/pageMeta';
import { posts } from '../data/posts';

// 404:走错路了。做成游戏机上的「GAME OVER」——
// 上半屏是错误状态和两条出口(回首页 / 随便抽一篇),
// 下半屏给几条最新文章,别让人卡在死路上。
export default function NotFound() {
  usePageMeta({
    title: '404 · 页面不存在',
    description: '这一关不存在:链接可能拼错了,也可能文章已经被挪走。',
    path: '/404',
  });

  // 数据层已按 date 倒序,前 5 篇就是最新的 5 篇
  const latest = posts.slice(0, 5);

  return (
    <div className="empty-block nf-page">
      <p className="nf-badge">PLAYER 1 · 关卡不存在</p>
      <h1 className="game-over">GAME OVER</h1>
      <p className="nf-code">404</p>
      <p className="empty">
        这个地址没有对应的页面 —— 链接可能拼错了,也可能文章已经被挪走。
      </p>

      <div className="nf-actions">
        <Link to="/" className="back-home">
          回到首页
        </Link>
        <Link to="/random" className="nf-btn">
          随便看一篇
        </Link>
      </div>

      {latest.length > 0 && (
        <section className="nf-recent">
          <h2 className="nf-recent-head">
            从这几篇继续
            <span className="nf-cursor" aria-hidden="true">
              █
            </span>
          </h2>
          <ul className="nf-recent-list">
            {latest.map((post) => (
              <li key={post.slug} className="nf-recent-item">
                <Link to={`/post/${post.slug}`} className="nf-recent-link">
                  {post.title}
                </Link>
                <span className="nf-recent-date">{formatDate(post.date)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
