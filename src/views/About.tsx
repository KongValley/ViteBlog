import { lazy, Suspense } from 'react';
import PlayerScreen from '../components/PlayerScreen';
import { SocialIcon } from '../components/SocialIcon';
import { type SocialLink, site } from '../data/site';

// 音乐播放器(APlayer)只在关于页用得到,单独切一个 chunk,别让首页替它买单
const MusicCard = lazy(() => import('../components/MusicCard'));

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
    </div>
  );
}

// 联系卡片:社交账号胶囊,数据全部来自 site.yml
// 社交账号会自动补上 GitHub(用 githubUser 拼);没有可显示的条目则整卡隐藏
function ContactCard() {
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

  if (socials.length === 0) return null;

  return (
    <section className="contact-card">
      <div className="contact-main">
        <h2 className="contact-title">来聊聊吧</h2>
        <p className="contact-note">
          文章里的错误、想讨论的技术问题,或者只是想打个招呼,都欢迎来找我。
        </p>

        <div className="contact-social">
          {socials.map((link) => (
            <a
              key={link.name}
              className="contact-pill"
              href={link.url}
              target="_blank"
              rel="noopener"
            >
              <SocialIcon name={link.name} url={link.url} />
              <span className="contact-pill-name">{link.name}</span>
              {link.handle && (
                <span className="contact-pill-handle">{link.handle}</span>
              )}
            </a>
          ))}
        </div>
      </div>

      {/* 头像区:像素主题直接复用首页那块掌机屏幕(在区域内居中),
          其余主题仍用普通头像图,各自的主题 CSS 已按自己的设计语言写好 */}
      {site.avatar &&
        (site.theme === 'pixel' ? (
          <div className="contact-screen">
            <PlayerScreen />
          </div>
        ) : (
          <img
            className="contact-avatar"
            src={site.avatar}
            alt={site.author}
            loading="lazy"
          />
        ))}
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
          内容以成系列的笔记为主:JavaScript 从变量、闭包写到异步与模块,
          TypeScript 从基础类型、泛型写到工具类型与工程化,Node 和 Python
          从运行时、标准库一路写到 Web 框架、数据库与部署;此外还有这个博客
          从零搭起、发布到 GitHub Pages 的完整过程,以及一些日常工具与折腾记录。
        </p>
        <p>
          本站使用 <strong>React + Vite</strong> 搭建,文章以 Markdown 编写,
          托管在 GitHub Pages 上,通过 GitHub Actions 自动构建部署 —— 每次 push
          到 main 分支,几分钟内线上就会更新。
        </p>
        <p>
          没有后端和数据库:文章就是 <code>src/posts/</code> 下的 Markdown 文件,
          标题、日期、标签、摘要这些都写在文件头的 frontmatter 里;站点信息集中在
          <code>site.yml</code>,主题也是其中的一项 ——
          改一个字段就能换掉整套风格, 构建时只会打包选中的那一套。
        </p>
      </div>
      <Suspense
        fallback={
          <section className="music-card">
            <h2 className="music-card-title">正在听</h2>
            <p className="music-card-hint">音乐加载中…</p>
          </section>
        }
      >
        <MusicCard />
      </Suspense>
      <ContactCard />
    </section>
  );
}
