// 分享图上的摘录:优先用 frontmatter 的 excerpt(作者写好的简介),
// 老文章没写就从正文里摘第一段能用的,顺手把 markdown 记号剥掉。
// 长度压在一两行内 —— 分享图上它只占一小块,长了会跟二维码抢地方。

/**
 * 这些开头的行不适合当摘录:标题、代码围栏、引用、列表、提示块、表格、图片。
 * 注意是「逐行」判断 —— 标题下面紧跟着正文(中间没有空行)是很常见的写法,
 * 按空行切块会把整块一起丢掉,摘录就成了空。
 */
const SKIP_LINE = /^(#{1,6}\s|```|~~~|>|\s*[-*+]\s|\s*\d+\.\s|:::|\||!\[)/;

const MAX_LENGTH = 96;

/** 剥掉行内记号,压成一行纯文本 */
function plainText(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // 图片
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // 链接只留文字
    .replace(/`([^`]+)`/g, '$1') // 行内代码
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // 加粗
    .replace(/(\*|_)(?=\S)(.*?)(?<=\S)\1/g, '$2') // 斜体
    .replace(/<[^>]+>/g, '') // 行内 HTML
    .replace(/\s+/g, ' ')
    .trim();
}

export function excerptFromMarkdown(markdown: string): string {
  const paragraphs: string[] = [];
  let current: string[] = [];
  let fence = false;

  const flush = () => {
    if (current.length > 0) paragraphs.push(current.join(' '));
    current = [];
  };

  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim();
    // 代码块整段跳过:里面的内容当摘录读起来莫名其妙
    if (/^(```|~~~)/.test(line)) {
      fence = !fence;
      flush();
      continue;
    }
    if (fence) continue;
    if (line === '' || SKIP_LINE.test(line)) {
      flush();
      continue;
    }
    current.push(line);
  }
  flush();

  for (const paragraph of paragraphs) {
    const plain = plainText(paragraph);
    // 只有几个字的残句(小标题、分隔符)不值得放上去
    if (plain.length < 12) continue;
    return plain.length > MAX_LENGTH
      ? `${plain.slice(0, MAX_LENGTH).trimEnd()}…`
      : plain;
  }
  return '';
}
