import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { parse } from 'yaml'
import { defineConfig } from 'vite'

const root = dirname(fileURLToPath(import.meta.url))

// 把根目录的 site.yml 注入为虚拟模块 import 'virtual:site-config'
// 这样站点配置只需要改 yml 文件,不用碰代码
function siteConfig() {
  const file = resolve(root, 'site.yml')
  return {
    name: 'site-config-yml',
    resolveId(id) {
      if (id === 'virtual:site-config') return '\0site-config'
    },
    load(id) {
      if (id !== '\0site-config') return
      this.addWatchFile(file) // yml 改动时触发本地热更新
      try {
        const parsed = parse(readFileSync(file, 'utf8')) ?? {}
        return `export default ${JSON.stringify(parsed)}`
      } catch (err) {
        throw new Error(`site.yml 配置文件解析失败,请检查格式(注意冒号后要有空格):${err.message}`)
      }
    },
  }
}

// base 必须与 GitHub 仓库名一致(GitHub Pages 会部署在 /仓库名/ 子路径下)
// 如果仓库改名,记得同步修改这里
export default defineConfig({
  base: '/ViteBlog/',
  plugins: [vue(), siteConfig()],
})
