import { useEffect, useRef } from 'react';
import './Reading.css';

// 顶部阅读进度条:一条按正文滚动进度推进的细线。
//
// 进度按**正文元素**(.post-content)算,而不是拿整页的 scrollY / 文档高度:
// 正文上下还挂着标题、上下篇导航、页脚,按整页算的话进度条会在正文读完之前
// 就走到 100%,读者会觉得"还没读完就满了"。
//   rect.top                正文顶端相对视口顶端的位置,顶端对齐时为 0,继续下滚变负
//   rect.height - innerHeight  正文比视口高出来的部分,也就是正文本身可滚的距离
// 两者相除就是正文的阅读进度;正文不足一屏时没有可滚区间,直接算读完。
export default function ReadingProgress() {
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 同一帧里的多次 scroll 只算一次,避免一次滚动里反复读取 getBoundingClientRect
    // (它会强制同步布局)
    let frame = 0;

    const update = () => {
      frame = 0;
      const fill = fillRef.current;
      if (!fill) return;
      const content = document.querySelector<HTMLElement>('.post-content');
      if (!content) {
        fill.style.transform = 'scaleX(0)';
        return;
      }
      const rect = content.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      const ratio = scrollable > 0 ? -rect.top / scrollable : 1;
      fill.style.transform = `scaleX(${Math.min(1, Math.max(0, ratio))})`;
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    // 先算一次:首次渲染、或带锚点直接落在文中时,进度条不该停在 0
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    // 转屏 / 改窗口大小会同时改变正文与视口高度,重新量一遍
    window.addEventListener('resize', schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  return (
    <div className="reading-progress" aria-hidden="true">
      <div className="reading-progress-fill" ref={fillRef} />
    </div>
  );
}
