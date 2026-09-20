import { useState } from 'react';
import { Link } from 'react-router-dom';
import { type SocialLink, site } from '../data/site';

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

// 联系卡片:邮箱 + 社交账号,数据全部来自 site.yml
// 邮箱留空就不显示那一行;社交账号会自动补上 GitHub(用 githubUser 拼)
function ContactCard() {
  const [copied, setCopied] = useState(false);

  const socials: SocialLink[] = [];
  if (site.githubUser) {
    socials.push({ name: 'GitHub', handle: site.githubUser, url: site.github });
  }
  for (const link of site.social) {
    const exists = socials.some(
      (item) => item.name.toLowerCase() === link.name.toLowerCase(),
    );
    if (!exists) socials.push(link);
  }

  if (!site.email && socials.length === 0) return null;

  const copyEmail = async () => {
    try {
      if (!navigator.clipboard) throw new Error('剪贴板不可用');
      await navigator.clipboard.writeText(site.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="contact-card">
      <h2 className="contact-title">来聊聊吧</h2>
      <p className="contact-note">
        文章里的错误、想讨论的技术问题,或者只是想打个招呼,都欢迎写信给我。
      </p>

      {site.email && (
        <div className="contact-mail">
          <span className="contact-email">{site.email}</span>
          <button type="button" className="contact-copy" onClick={copyEmail}>
            {copied ? '已复制' : '复制邮箱'}
          </button>
        </div>
      )}

      {socials.length > 0 && (
        <div className="contact-social">
          {socials.map((link) => (
            <a
              key={link.name}
              className="contact-pill"
              href={link.url}
              target="_blank"
              rel="noopener"
            >
              <span className="contact-pill-name">{link.name}</span>
              {link.handle && (
                <span className="contact-pill-handle">{link.handle}</span>
              )}
            </a>
          ))}
        </div>
      )}
    </section>
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
        <p className="about-note">
          这段内容在 <code>src/views/About.tsx</code>,改成你自己的介绍吧。
        </p>
      </div>
      <ContactCard />
    </section>
  );
}
