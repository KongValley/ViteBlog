import { Link } from 'react-router-dom';
import { site } from '../data/site';

// 终端风格小卡片(仿 open source 项目卡)
function TerminalCard() {
  return (
    <div className="terminal-card">
      <div className="term-top">
        <pre className="term-cat" aria-hidden="true">{` /\\_/\\\n( o.o )`}</pre>
        <div className="term-lines">
          <p>$ hello, world</p>
          <p>$ open source</p>
        </div>
      </div>
      <p className="term-sub pixel-en">$ OPEN · SOURCE · 100% STATIC</p>
      <p className="term-title">A_pixel_blog_by_{site.githubUser}</p>
      <div className="term-actions">
        <Link to="/post/hello-vite-blog" className="term-btn">
          $ get started
        </Link>
        <a
          className="term-btn"
          href={site.github}
          target="_blank"
          rel="noopener"
        >
          $ view source
        </a>
      </div>
    </div>
  );
}

export default function About() {
  return (
    <section className="about">
      <h1 className="section-title">关于本站</h1>
      <TerminalCard />
      <div className="about-body">
        <p>
          你好,我是 {site.author} 👋 这里是我的个人博客,用来记录前端学习笔记、
          开发中踩过的坑,以及一些有趣的东西。
        </p>
        <p>
          本站使用 <strong>React + Vite</strong> 搭建,文章以 Markdown 编写,
          托管在 GitHub Pages 上,通过 GitHub Actions 自动构建部署 —— 每次 push
          到 main 分支,几分钟内线上就会更新。
        </p>
        <h2>如何联系我</h2>
        <ul>
          <li>
            GitHub:
            <a href={site.github} target="_blank" rel="noopener">
              {site.github}
            </a>
          </li>
        </ul>
        <p className="about-note">
          这段内容在 <code>src/views/About.tsx</code>,改成你自己的介绍吧。
        </p>
      </div>
    </section>
  );
}
