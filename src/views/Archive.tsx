import { Link } from 'react-router-dom';
import '../components/Archive.css';
import { usePageMeta } from '../data/pageMeta';
import { archive, siteStats } from '../data/posts';

// 行首只写"日":年和月都已经写在分组标题上,重复一遍反而吵
function dayOf(date: string): string {
  const day = date.split(' ')[0]?.split('-')[2];
  if (!day) return '';
  return String(Number(day)).padStart(2, '0');
}

// 月份字段偶尔可能是"未知"之类的兜底值,是数字才加"月"
function monthLabel(month: string): string {
  return /^\d+$/.test(month) ? `${Number(month)} 月` : month;
}

// 归档:年 → 月两级时间线,月份右侧按日期倒序列出文章
export default function Archive() {
  // archive() 按 date 倒序分组,第一组最新、最后一组最早
  const years = archive();
  const newest = years[0]?.year;
  const oldest = years.at(-1)?.year;
  const span =
    newest && oldest
      ? newest === oldest
        ? newest
        : `${oldest} — ${newest}`
      : '';

  usePageMeta({
    title: '归档',
    description: `按时间浏览 ${siteStats.posts} 篇文章${span ? `(${span})` : ''}。`,
    path: '/archive',
  });

  return (
    <section className="archive-page">
      <header className="archive-head">
        <h1 className="archive-title">归档</h1>
        <p className="archive-sub">
          共 <b className="archive-count">{siteStats.posts}</b> 篇 · 跨越{' '}
          <b className="archive-count">{span || '—'}</b> · 约{' '}
          <b className="archive-count">
            {siteStats.words.toLocaleString('zh-CN')}
          </b>{' '}
          字
        </p>
      </header>

      {years.length === 0 ? (
        <p className="archive-empty">还没有文章,时间线是空的。</p>
      ) : (
        <div className="archive-timeline">
          {years.map((year) => (
            <section key={year.year} className="archive-year">
              <h2 className="archive-year-label">
                {year.year}
                <span className="archive-year-count">{year.count} 篇</span>
              </h2>

              <div className="archive-months">
                {year.months.map((group) => (
                  <div key={group.month} className="archive-month">
                    <h3 className="archive-month-label">
                      {monthLabel(group.month)}
                    </h3>

                    <ul className="archive-month-posts">
                      {group.posts.map((post) => (
                        <li key={post.slug} className="archive-entry">
                          <Link to={`/post/${post.slug}`}>
                            <time
                              className="archive-entry-day"
                              dateTime={post.date}
                            >
                              {dayOf(post.date)}
                            </time>
                            <span>{post.title}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
