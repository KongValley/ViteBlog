import { readFileSync, readdirSync, statSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { parse } from 'yaml'
import { defineConfig, type Plugin } from 'vite'

const root = dirname(fileURLToPath(import.meta.url))

// 把根目录的 site.yml 注入为虚拟模块 import 'virtual:site-config'
// 这样站点配置只需要改 yml 文件,不用碰代码
function siteConfig(): Plugin {
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
        throw new Error(
          `site.yml 配置文件解析失败,请检查格式(注意冒号后要有空格):${(err as Error).message}`,
        )
      }
    },
  }
}

// 文章排序用的"创建时间":优先取 git 首次提交时间(CI 检出后文件系统时间戳不可靠),
// 不是 git 仓库时回退文件系统创建/修改时间。注入为 virtual:post-times
function postTimes(): Plugin {
  const dir = resolve(root, 'src/posts')
  return {
    name: 'post-created-times',
    resolveId(id) {
      if (id === 'virtual:post-times') return '\0post-times'
    },
    load(id) {
      if (id !== '\0post-times') return
      const times: Record<string, number> = {}
      const files: string[] = []
      const collectMarkdownFiles = (directory: string, prefix = ''): void => {
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
          if (entry.isDirectory()) {
            collectMarkdownFiles(resolve(directory, entry.name), `${prefix}${entry.name}/`)
          } else if (entry.isFile() && entry.name.endsWith('.md')) {
            files.push(`${prefix}${entry.name}`)
          }
        }
      }
      collectMarkdownFiles(dir)

      for (const f of files) {
        let ts = 0
        try {
          const out = execSync(`git log --diff-filter=A --format=%at -- src/posts/${f}`, {
            cwd: root,
            encoding: 'utf8',
          })
            .trim()
            .split(/\r?\n/)
            .filter(Boolean)
          if (out.length > 0) ts = Number(out[out.length - 1]) * 1000
        } catch {
          /* 不是 git 仓库或没有提交记录,走文件系统回退 */
        }
        if (!ts) {
          const st = statSync(resolve(dir, f))
          ts = st.birthtimeMs > 0 ? st.birthtimeMs : st.mtimeMs
        }
        times[f] = ts
        this.addWatchFile(resolve(dir, f))
      }
      return `export default ${JSON.stringify(times)}`
    },
  }
}

// base 必须与 GitHub 仓库名一致(GitHub Pages 会部署在 /仓库名/ 子路径下)
// 如果仓库改名,记得同步修改这里
export default defineConfig({
  base: '/ViteBlog/',
  plugins: [react(), siteConfig(), postTimes()],
})
