import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// base 必须与 GitHub 仓库名一致(GitHub Pages 会部署在 /仓库名/ 子路径下)
// 如果仓库改名,记得同步修改这里
export default defineConfig({
  base: '/ViteBlog/',
  plugins: [vue()],
})
