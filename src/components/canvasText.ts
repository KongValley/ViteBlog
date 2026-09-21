// 分享图上的文本排版:纯函数,只用到 ctx.measureText(text).width 一个能力,
// 所以能脱离 canvas 单测(假 ctx 返回 每个字符 10px 就够,见 canvasText.test.ts)。

/**
 * 没有空格的超长词(分享图上的网址、长哈希)按字符切成能放下的块。
 * 不切的话它在下面会被当成一个塞不进的 token 整段画出去,直接画到卡片外面。
 */
export function splitByWidth(
  ctx: CanvasRenderingContext2D,
  token: string,
  maxWidth: number,
): string[] {
  const chunks: string[] = [];
  let chunk = '';
  for (const char of token) {
    if (chunk && ctx.measureText(chunk + char).width > maxWidth) {
      chunks.push(chunk);
      chunk = char;
    } else {
      chunk += char;
    }
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

// 按可用宽度把文本切成若干行(中文逐字、英文按词,简单但够用)
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines: string[] = [];
  let current = '';
  const tokens = (
    text.match(/[\u4e00-\u9fff\u3000-\u303f]|[^\s\u4e00-\u9fff]+|\s+/g) ?? [
      text,
    ]
  ).flatMap((token) =>
    ctx.measureText(token).width <= maxWidth
      ? [token]
      : splitByWidth(ctx, token, maxWidth),
  );
  for (const token of tokens) {
    const candidate = current + token;
    if (ctx.measureText(candidate.trimEnd()).width <= maxWidth || !current) {
      current = candidate;
      continue;
    }
    lines.push(current.trimEnd());
    current = token.trimStart();
    if (lines.length === maxLines - 1) break;
  }
  if (current.trim() && lines.length < maxLines) lines.push(current.trimEnd());

  // 只有真的没放下(有内容被丢掉)才加省略号 —— 否则「一行就装下」的短文本也会被加上「…」
  const used = lines.join('').replace(/\s+/g, '').length;
  if (used < text.replace(/\s+/g, '').length && lines.length === maxLines) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 1) {
      last = last.slice(0, -1);
    }
    lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}
