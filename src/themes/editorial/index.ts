// 主题入口:现代编辑排版风
// site.yml 的 theme: editorial 时,由 virtual:site-theme 引入本文件
import './style.css';

// 中文字体(Noto Serif/Sans SC)的 unicode-range 声明体积较大,
// 异步加载避免阻塞首屏;浏览器只会下载页面实际用到的字形子集
void import('./fonts');
