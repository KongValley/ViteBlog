// 分享图上的摘录:优先用 frontmatter 的 excerpt(作者写好的简介),
// 老文章没写就从正文里摘第一段能用的,顺手把 markdown 记号剥掉。
// 长度压在一两行内 —— 分享图上它只占一小块,长了会跟二维码抢地方。

/** 这些开头的段落不适合当摘录:标题、代码围栏、引用、列表、提示块、表格、图片行 */
const SKIP = /^(#{1,6}\s|```|~~~|>|\s*[-*+]\s|\s*\d+\.\s|:::|\||!\[)/;

const MAX_LENGTH = 96;

export function excerptFromMarkdown(markdown: string): string {
  for (const block of markdown.split(/\n{2,}/)) {
    const text = block.trim();
    if (!text || SKIP.test(text)) continue;

    const plain = text
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // 图片
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // 链接只留文字
      .replace(/`([^`]+)`/g, '$1') // 行内代码
      .replace(/(\*\*|__)(.*?)\1/g, '$2') // 加粗
      .replace(/(\*|_)(?=\S)(.*?)(?<=\S)\1/g, '$2') // 斜体
      .replace(/<[^>]+>/g, '') // 行内 HTML
      .replace(/\s+/g, ' ')
      .trim();

    // 只有几个字的残句(小标题、分隔符)不值得放上去
    if (plain.length < 12) continue;
    return plain.length > MAX_LENGTH
      ? `${plain.slice(0, MAX_LENGTH).trimEnd()}…`
      : plain;
  }
  return '';
}
