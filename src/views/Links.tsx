import { usePageMeta } from '../data/pageMeta';
import { site } from '../data/site';
import './Links.css';

// 友链页:卡片墙,数据全部来自 site.yml 的 friends 段(顺序即展示顺序);
// 没配 friends(或全被过滤掉)时显示空态提示,不报错
export default function Links() {
  const friends = site.friends;

  usePageMeta({
    title: '友情链接',
    description: '友情链接 —— 记录一些常读的博客与朋友,欢迎交换友链。',
    path: '/links',
  });

  return (
    <section className="links-page">
      <header className="links-head">
        <h1 className="links-title">友情链接</h1>
        <p className="links-sub">
          共 <b className="links-count">{friends.length}</b> 位邻居
        </p>
      </header>

      {friends.length === 0 ? (
        <p className="links-empty">
          这里还空着 —— 在 <code>site.yml</code> 的 <code>friends</code>{' '}
          段里填上 name 与 url,卡片就会出现在这里。
        </p>
      ) : (
        <ul className="links-grid">
          {friends.map((friend) => (
            <li key={`${friend.name}-${friend.url}`}>
              <a
                className="links-card"
                href={friend.url}
                target="_blank"
                rel="noopener"
              >
                {friend.avatar ? (
                  <img
                    className="links-avatar"
                    src={friend.avatar}
                    alt={`${friend.name} 的头像`}
                    loading="lazy"
                  />
                ) : (
                  /* 没填头像时用名称首字占位,卡片左边不留豁口 */
                  <span
                    className="links-avatar links-avatar-fallback"
                    aria-hidden="true"
                  >
                    {[...friend.name.trim()][0]?.toUpperCase() ?? '?'}
                  </span>
                )}
                <span className="links-info">
                  <span className="links-name">{friend.name}</span>
                  {friend.desc && (
                    <span className="links-desc">{friend.desc}</span>
                  )}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
