// Markdown 渲染器:marked + highlight.js 语法高亮
// 按需注册语言,控制打包体积;写新文章用到别的语言时在这里加一行即可
import { Marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import yaml from 'highlight.js/lib/languages/yaml'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'
import markdown from 'highlight.js/lib/languages/markdown'
import plaintext from 'highlight.js/lib/languages/plaintext'
import python from 'highlight.js/lib/languages/python'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('yml', yaml)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('sh', bash)
hljs.registerLanguage('json', json)
hljs.registerLanguage('css', css)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('md', markdown)
hljs.registerLanguage('plaintext', plaintext)
hljs.registerLanguage('python', python)
hljs.registerLanguage('py', python)

export const marked = new Marked(
  markedHighlight({
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext'
      return hljs.highlight(code, { language }).value
    },
  }),
)

// CommonMark 的强调规则对中文标点不友好：闭 ** 前面是中文标点、后面紧跟文字时
// （如「**……首选。**个人版」）会被判定为无法闭合，** 原样输出。
// 解析前把星号内的句末中文标点移到星号外，渲染结果几乎不变，绕开这条规则。
// 限定条件避免误伤：开 ** 前不能是字母/数字/星号（排除把闭 ** 当开 ** 的跨段
// 误配），内容不能以空白开头，且只在闭 ** 后紧跟文字（真正无法闭合）时才改写。
const CJK_PUNCT = '。，、；：！？」』）】》'

function fixCjkStrong(source: string): string {
  return source
    .split(/(```[\s\S]*?(?:```|$)|`[^`\n]*`)/g)
    .map((part, i) =>
      i % 2 === 1
        ? part
        : part.replace(
            new RegExp(
              `(?<![\\p{L}\\p{N}*])\\*\\*(?!\\s)([^*\\n]*?)([${CJK_PUNCT}])\\*\\*(?=[^\\s*${CJK_PUNCT}"'（）【】《》()\\[\\]{}.,!?;:-])`,
              'gu',
            ),
            '**$1**$2',
          ),
    )
    .join('')
}

export function renderMarkdown(source: string): string {
  return marked.parse(fixCjkStrong(source)) as string
}
