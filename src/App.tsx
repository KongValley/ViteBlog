import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { site } from './data/site'
import Home from './views/Home'
import Post from './views/Post'
import About from './views/About'

type Theme = 'light' | 'dark'

function initialTheme(): Theme {
  const stored = localStorage.getItem('theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// 路由切换时回到页面顶部(代替 vue-router 的 scrollBehavior)
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('theme', theme)
  }, [theme])

  return (
    <div className="page">
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
            <NavLink to="/about" className="nav-link">
              关于
            </NavLink>
            <button
              className="theme-toggle"
              title={theme === 'dark' ? '切换到白天模式' : '切换到夜晚模式'}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? '昼' : '夜'}
            </button>
          </nav>
        </div>
      </header>

      <main className="main">
        <div className="container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/post/*" element={<Post />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <p className="footer-en pixel-en">
            © {site.since} {site.author} · POWERED BY REACT × VITE ·
            HOSTED ON GITHUB PAGES <span className="heart">♥</span>
          </p>
          <p className="footer-meta">
            由 <a href={site.github} target="_blank" rel="noopener">GitHub</a> Pages
            强力驱动 · {site.tagline}
          </p>
        </div>
      </footer>
    </div>
  )
}
