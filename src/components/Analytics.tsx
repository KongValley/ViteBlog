import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { site } from '../data/site';

// 访问统计:site.yml 里配了才加载,不配就一行脚本都不引(默认不收集任何数据)。
// 支持两种:GoatCounter(轻量、无 cookie)与自建 Umami。
// 站点是 SPA,脚本只在首帧统计一次,所以路由切换时手动补一次。

type GoatCounterWindow = Window & {
  goatcounter?: { count?: (options: { path: string }) => void };
};
type UmamiWindow = Window & {
  umami?: { track?: (options?: { url?: string }) => void };
};

function loadScript(attributes: Record<string, string>, src: string) {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const script = document.createElement('script');
  script.async = true;
  script.src = src;
  for (const [name, value] of Object.entries(attributes)) {
    script.setAttribute(name, value);
  }
  document.head.append(script);
}

export default function Analytics() {
  const { pathname } = useLocation();
  const { goatcounter, umamiSrc, umamiId } = site.analytics;

  // 首次进入:注入统计脚本
  useEffect(() => {
    if (goatcounter) {
      loadScript(
        { 'data-goatcounter': `https://${goatcounter}.goatcounter.com/count` },
        'https://gc.zgo.at/count.js',
      );
    }
    if (umamiSrc && umamiId) {
      loadScript({ 'data-website-id': umamiId }, umamiSrc);
    }
  }, [goatcounter, umamiSrc, umamiId]);

  // 路由变化:给统计脚本补一次页面浏览
  useEffect(() => {
    if (!goatcounter && !(umamiSrc && umamiId)) return;
    const timer = window.setTimeout(() => {
      const path = `${import.meta.env.BASE_URL}${pathname.replace(/^\//, '')}`;
      if (goatcounter) {
        (window as GoatCounterWindow).goatcounter?.count?.({ path });
      }
      if (umamiSrc && umamiId) {
        (window as UmamiWindow).umami?.track?.({ url: path });
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [pathname, goatcounter, umamiSrc, umamiId]);

  return null;
}
