import { useEffect, useRef, useState } from 'react';
import './Reading.css';

export type MobileTocItem = { id: string; text: string; level: 2 | 3 };

type MobileTocProps = {
  /** 目录项,和正文 h2/h3 上的 id 一一对应 */
  toc: MobileTocItem[];
  /** 当前正在读的小节 id(由文章页的滚动监听算出来后传进来) */
  activeId: string;
};

// 窄屏目录:宽屏时正文左侧已经挂着一卷「卷轴目录」(≥1100px 那套),窄屏没地方放,
// 就收成右下角一个悬浮按钮,点开是浮层目录。≥1200px 由 CSS 整个隐藏(见 Reading.css)。
export default function MobileToc({ toc, activeId }: MobileTocProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // 浮层打开时挂两个全局监听:Esc 关闭、点浮层外关闭。
  // 用 pointerdown 判"外面"而不是铺一层遮罩,是因为遮罩会挡住正文的选字与点击。
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  // 没有小标题的短文章不占屏
  if (toc.length === 0) return null;

  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    // 跳完就收起来,不然浮层会一直盖着刚滚到的那段正文
    setOpen(false);
  };

  return (
    <div className="toc-fab" ref={wrapRef}>
      {open && (
        <nav className="toc-fab-panel" aria-label="文章目录">
          <p className="toc-fab-title">目 录</p>
          <ul className="toc-fab-list">
            {toc.map((item) => (
              <li
                key={item.id}
                className={item.level === 3 ? 'toc-fab-h3' : undefined}
              >
                <a
                  href={`#${item.id}`}
                  className={
                    activeId === item.id
                      ? 'toc-fab-link toc-fab-active'
                      : 'toc-fab-link'
                  }
                  aria-current={activeId === item.id ? 'location' : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    jump(item.id);
                  }}
                >
                  {item.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <button
        type="button"
        className="toc-fab-btn"
        aria-label={open ? '收起目录' : '展开目录'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="toc-fab-icon" aria-hidden="true">
          ☰
        </span>
        目录
      </button>
    </div>
  );
}
