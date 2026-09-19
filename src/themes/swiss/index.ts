// 主题入口:瑞士网格风
// site.yml 的 theme: swiss 时,由 virtual:site-theme 引入本文件
import './style.css';

// 中文字体(Noto Sans SC)的 unicode-range 声明体积较大,
// 异步加载避免阻塞首屏;浏览器只会下载页面实际用到的字形子集
void import('./fonts');
