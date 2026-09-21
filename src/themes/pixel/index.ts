// 主题入口:红白机像素风
// site.yml 的 theme: pixel 时,由 virtual:site-theme 引入本文件
import '@fontsource/press-start-2p';
import '@fontsource/fira-code/400.css';
import '@fontsource/fira-code/700.css';
import './style.css';

// 正文的中西文像素字体(scripts/subset-fonts.mjs 裁出来的子集,声明在 fonts.css 里):
// 体积比拉丁字体大一个量级,异步加载,不占首屏的主样式块
void import('./fonts.css');
