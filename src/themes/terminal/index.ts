// 主题入口:终端 CLI
// site.yml 的 theme: terminal 时,由 virtual:site-theme 引入本文件
import './style.css';

// 中文字体(Noto Sans SC)声明体积较大,异步加载避免阻塞首屏
void import('./fonts');
