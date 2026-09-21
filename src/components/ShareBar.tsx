import { useEffect, useState } from 'react';
import { site } from '../data/site';
import SharePoster from './SharePoster';
import './ShareBar.css';

type Props = {
  /** 文章标题,作为分享文案 */
  title: string;
  /** 相对站点 base 的路径,如 /post/xxx */
  path: string;
  /** 文章日期,画在分享图上 */
  date: string;
  /** 阅读时长(分钟),画在分享图上 */
  minutes: number;
  /** 标签,画在分享图上 */
  tags: string[];
  /** 封面图,有就铺在分享图顶部 */
  cover?: string;
  /** 摘录,放在标题下面 */
  excerpt?: string;
};

// 把相对路径拼成可直接分享的绝对地址(与预渲染 HTML 里的 canonical 一致)
function absoluteUrl(path: string): string {
  const base = import.meta.env.BASE_URL;
  const origin = typeof location === 'undefined' ? '' : location.origin;
  return `${origin}${base}${path.replace(/^\//, '')}`;
}

/**
 * 文章底部分享条:复制链接 / 微博 / X;支持系统分享的设备(iOS、Android、部分桌面浏览器)
 * 额外给一个「系统分享」按钮。分享出去的是 SPA 路由地址,打开后由 GitHub Pages 的
 * /post/<slug>.html 预渲染文件返回正确的 title/description/OG 图。
 */
export default function ShareBar({
  title,
  path,
  date,
  minutes,
  tags,
  cover,
  excerpt,
}: Props) {
  const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle');
  const [canNativeShare, setCanNativeShare] = useState(false);
  const url = absoluteUrl(path);
  const text = `${title} · ${site.name}`;

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && 'share' in navigator);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied('done');
    } catch {
      setCopied('failed');
    }
    window.setTimeout(() => setCopied('idle'), 1600);
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: text, url });
    } catch {
      // 用户取消分享(AbortError)不算失败,什么都不做
    }
  };

  const encode = (value: string) => encodeURIComponent(value);
  const targets = [
    {
      name: '微博',
      href: `https://service.weibo.com/share/share.php?url=${encode(url)}&title=${encode(text)}`,
    },
    {
      name: 'X',
      href: `https://twitter.com/intent/tweet?url=${encode(url)}&text=${encode(text)}`,
    },
  ];

  return (
    <div className="share-bar">
      <span className="share-label">分享</span>
      <button type="button" className="share-btn" onClick={copy}>
        {copied === 'done'
          ? '已复制'
          : copied === 'failed'
            ? '复制失败'
            : '复制链接'}
      </button>
      {targets.map((target) => (
        <a
          key={target.name}
          className="share-btn"
          href={target.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {target.name}
        </a>
      ))}
      {canNativeShare && (
        <button type="button" className="share-btn" onClick={nativeShare}>
          系统分享
        </button>
      )}
      <SharePoster
        title={title}
        cover={cover}
        excerpt={excerpt}
        path={path}
        date={date}
        minutes={minutes}
        tags={tags}
      />
      <span className="share-url" title={url}>
        {url.replace(/^https?:\/\//, '')}
      </span>
    </div>
  );
}
