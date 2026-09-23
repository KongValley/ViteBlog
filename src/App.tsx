import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import './App.css';
import Analytics from './components/Analytics';
import BackToTop from './components/BackToTop';
import EasterEggs from './components/EasterEggs';
import KeyboardShortcuts from './components/KeyboardShortcuts';
import { posts } from './data/posts';
import { installLinkPrefetch, warmOnIdle } from './data/prefetch';
import { site } from './data/site';
import About from './views/About';
import Home from './views/Home';
import Tags from './views/Tags';

// 音乐挂件(APlayer)是个固定层,单独切一个 chunk:首屏 JS 不受它影响,
// 挂件本身在首帧之后异步补上(固定层的东西,晚一点出现不占位、不闪)
const MusicDock = lazy(() => import('./components/MusicDock'));
// 文章页把 marked + highlight.js(约 100KB+)也一起带走:首页/标签页不再为它们买单
const Post = lazy(() => import('./views/Post'));
const Search = lazy(() => import('./views/Search'));
const Categories = lazy(() => import('./views/Categories'));
const Category = lazy(() => import('./views/Category'));
const Archive = lazy(() => import('./views/Archive'));
const Random = lazy(() => import('./views/Random'));
const NotFound = lazy(() => import('./views/NotFound'));
const Links = lazy(() => import('./views/Links'));

type Theme = 'light' | 'dark';

function initialTheme(): Theme {
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

// 路由切换时回到页面顶部(react-router 没有内置的滚动复位,手动实现)
function ScrollToTop() {
  const { pathname } = useLocation();
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname 不在闭包里读取,这里仅作为"路由变了"的触发器
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  // 跳转意图预取:悬停/聚焦文章链接时先取那一篇(正文 chunk + 文章页 chunk),
  // 空闲时再预热文章页 chunk 与首页最新的三篇 —— 点进去时不再先看到
  // 「正文加载中…」和一段挤在目录列里的错版
  useEffect(() => {
    const stopPrefetch = installLinkPrefetch();
    const onHome = window.location.pathname === import.meta.env.BASE_URL;
    warmOnIdle(onHome ? posts.slice(0, 3).map((post) => post.slug) : []);
    return stopPrefetch;
  }, []);

  return (
    <>
      <div className="page">
        {/* 跳转到正文:键盘 / 读屏用户不用把整个导航条 Tab 一遍 */}
        <a className="skip-link" href="#main">
          跳到正文
        </a>
        <ScrollToTop />

        <header className="header">
          <div className="container header-inner">
            <Link to="/" className="brand">
              {site.name}
              <span className="brand-dot">.</span>
            </Link>
            <nav className="nav">
              <NavLink to="/" end className="nav-link">
                首页
              </NavLink>
              <NavLink to="/search" className="nav-link">
                搜索
              </NavLink>
              <NavLink to="/tags" className="nav-link">
                标签
              </NavLink>
              <NavLink to="/categories" className="nav-link">
                分类
              </NavLink>
              <NavLink to="/archive" className="nav-link">
                归档
              </NavLink>
              <NavLink to="/about" className="nav-link">
                关于
              </NavLink>
              <button
                type="button"
                className="theme-toggle"
                title={theme === 'dark' ? '切换到白天模式' : '切换到夜晚模式'}
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? '昼' : '夜'}
              </button>
            </nav>
          </div>
        </header>

        <main className="main" id="main">
          <div className="container">
            <Suspense fallback={<p className="route-loading">LOADING…</p>}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/post/*" element={<Post />} />
                <Route path="/tags" element={<Tags />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/categories/:name" element={<Category />} />
                <Route path="/archive" element={<Archive />} />
                <Route path="/search" element={<Search />} />
                <Route path="/random" element={<Random />} />
                <Route path="/about" element={<About />} />
                <Route path="/links" element={<Links />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </div>
        </main>

        <footer className="footer">
          <div className="container">
            <p className="footer-links">
              {/* 订阅入口放页脚:feed.xml / atom.xml 是构建期产物,直接静态链接即可 */}
              <a href={`${import.meta.env.BASE_URL}feed.xml`}>RSS</a>
              <span aria-hidden="true">·</span>
              <a href={`${import.meta.env.BASE_URL}atom.xml`}>Atom</a>
              <span aria-hidden="true">·</span>
              <a href={`${import.meta.env.BASE_URL}sitemap.xml`}>Sitemap</a>
              <span aria-hidden="true">·</span>
              <Link to="/links">友链</Link>
            </p>
            <p className="footer-en pixel-en">
              © {site.since} {site.author} · POWERED BY REACT × VITE · HOSTED ON
              GITHUB PAGES <span className="heart">♥</span>
            </p>
          </div>
        </footer>
      </div>

      {/* 固定层挂件放在 .page 外面:宽屏放大是给 .page 加 zoom 的,挂件跟着放大会糊成一团 */}
      <BackToTop />
      <KeyboardShortcuts />
      <EasterEggs />
      <Analytics />
      <Suspense fallback={null}>
        <MusicDock />
      </Suspense>
    </>
  );
}
