// 瑞士网格皮肤的中文字体(Noto Sans SC,三个字重的 unicode-range 声明约 300KB)
// 单独成模块,由 skin.ts 在需要时动态 import —— Vite 会把它拆成异步 chunk,
// 像素皮肤的访客不会下载这部分,只有切到瑞士皮肤时才加载。
import '@fontsource/noto-sans-sc/400.css';
import '@fontsource/noto-sans-sc/500.css';
import '@fontsource/noto-sans-sc/700.css';
