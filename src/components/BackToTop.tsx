import { useEffect, useState } from 'react';

// 滚动超过这个距离后才显示按钮,避免首屏遮挡内容
const SHOW_AFTER = 320;

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      className="back-top"
      aria-label="回到顶部"
      title="回到顶部"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      <span className="back-top-arrow">▲</span>
      TOP
    </button>
  );
}
