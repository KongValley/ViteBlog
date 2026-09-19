import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
// 主题(样式与字体)由 site.yml 的 theme 字段在构建期决定:
// pixel / swiss / editorial 三选一,只会打包被选中的那一套
import 'virtual:site-theme';
import App from './App';

// biome-ignore lint/style/noNonNullAssertion: index.html 里保证了 #app 存在
const container = document.getElementById('app')!;

createRoot(container).render(
  <StrictMode>
    {/* basename 取 Vite 的 base(/ViteBlog/),路由才能匹配 GitHub Pages 子路径 */}
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
