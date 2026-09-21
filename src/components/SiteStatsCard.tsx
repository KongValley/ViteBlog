import { Link } from 'react-router-dom';
import { siteStats } from '../data/posts';
import './SiteStatsCard.css';

// 「本站数据」卡片:关于页用,纯静态、零请求 —— 所有数字都是 siteStats 在构建期算好的
// (siteStats.topTags / topCategories 已经是前 8 个标签、前 6 个分类,这里不再切)
export default function SiteStatsCard() {
  // since 是形如 2020-01-01 的日期,面板上只关心年份
  const year = siteStats.since.slice(0, 4);

  return (
    <section className="site-stats" aria-labelledby="site-stats-title">
      <header className="site-stats-head">
        <h2 className="site-stats-title" id="site-stats-title">
          本站数据
        </h2>
        {/* 没有文章时 since 为空,这时整段不渲染,免得出现「年开始写」 */}
        {year && <span className="site-stats-since">{year} 年开始写</span>}
      </header>

      <div className="site-stats-grid">
        <div className="site-stats-cell">
          <b className="site-stats-num">{siteStats.posts}</b>
          <span className="site-stats-unit">篇文章</span>
        </div>
        {/* 总字数取整成「X.X 万字」:版面上一眼能读,精确值放 title */}
        <div className="site-stats-cell" title={`${siteStats.words} 字`}>
          <b className="site-stats-num">
            {(siteStats.words / 10000).toFixed(1)}
          </b>
          <span className="site-stats-unit">万字</span>
        </div>
        <div className="site-stats-cell">
          <b className="site-stats-num">{siteStats.tags}</b>
          <span className="site-stats-unit">个标签</span>
        </div>
        <div className="site-stats-cell">
          <b className="site-stats-num">{siteStats.categories}</b>
          <span className="site-stats-unit">个分类</span>
        </div>
      </div>

      {/* 标签胶囊统一进标签总览页;分类胶囊直接进对应分类页 */}
      {siteStats.topTags.length > 0 && (
        <div className="site-stats-row">
          <span className="site-stats-label">标签</span>
          <ul className="site-stats-chips">
            {siteStats.topTags.map((tag) => (
              <li key={tag.name}>
                <Link className="site-stats-chip" to="/tags">
                  {tag.name}
                  <span className="site-stats-count">{tag.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {siteStats.topCategories.length > 0 && (
        <div className="site-stats-row">
          <span className="site-stats-label">分类</span>
          <ul className="site-stats-chips">
            {siteStats.topCategories.map((category) => (
              <li key={category.name}>
                <Link
                  className="site-stats-chip"
                  to={`/categories/${encodeURIComponent(category.name)}`}
                >
                  {category.name}
                  <span className="site-stats-count">{category.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="site-stats-foot">数字在构建时算好,页面不请求任何数据。</p>
    </section>
  );
}
