import { useCallback, useEffect, useRef, useState } from 'react';
import { formatDate } from '../data/format';
import { site } from '../data/site';
import './SharePoster.css';

type Props = {
  title: string;
  /** 相对站点 base 的路径,如 /post/xxx */
  path: string;
  /** 文章元信息,画在海报上 */
  date: string;
  minutes: number;
  tags: string[];
};

const WIDTH = 800;
const HEIGHT = 1120;
const PADDING = 56;

// 画海报用的一套颜色:直接读当前主题的 CSS 变量,深浅色自动跟随
type Palette = {
  bg: string;
  surface: string;
  ink: string;
  inkStrong: string;
  muted: string;
  line: string;
  accent: string;
  font: string;
  fontCode: string;
};

function readPalette(): Palette {
  const styles = getComputedStyle(document.documentElement);
  const pick = (name: string, fallback: string) =>
    styles.getPropertyValue(name).trim() || fallback;
  return {
    bg: pick('--bg', '#f7edd5'),
    surface: pick('--surface', '#fdf6e3'),
    ink: pick('--ink', '#2a2a2a'),
    inkStrong: pick('--ink-strong', '#141414'),
    muted: pick('--muted', '#7a6f58'),
    line: pick('--line', '#1a1a1a'),
    accent: pick('--red', '#d82800'),
    font: pick('--font-body', 'system-ui, sans-serif'),
    fontCode: pick('--font-code', 'ui-monospace, monospace'),
  };
}

// 按可用宽度把标题切成若干行(中文逐字、英文按词,简单但够用)
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines: string[] = [];
  let current = '';
  const tokens = text.match(
    /[\u4e00-\u9fff\u3000-\u303f]|[^\s\u4e00-\u9fff]+|\s+/g,
  ) ?? [text];
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

  // 超出最大行数时,最后一行省略号收尾
  const rest = lines.length >= maxLines ? text : '';
  if (rest && lines.length === maxLines) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 1) {
      last = last.slice(0, -1);
    }
    lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

/**
 * 生成带二维码的分享长图(纯前端 canvas,不依赖任何第三方服务)。
 * 二维码指向文章的规范地址,别人扫码直接打开文章。
 * qrcode 库是点击时才 dynamic import 的,正常阅读不会下载它。
 */
export default function SharePoster({
  title,
  path,
  date,
  minutes,
  tags,
}: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'drawing' | 'ready' | 'failed'>(
    'idle',
  );
  const [dataUrl, setDataUrl] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const url = `${location.origin}${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
  const fileName = `${site.name}-${title.slice(0, 20).replace(/[\\/:*?"<>|\s]/g, '')}.png`;

  const draw = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setStatus('drawing');
    try {
      // 动态 import 是刻意的:二维码库只有点「生成分享图」时才需要,别让它进主包
      const { default: QRCode } = await import('qrcode');
      await document.fonts.ready;

      const qrSize = 280;
      const qr = await QRCode.toDataURL(url, {
        width: qrSize,
        margin: 1,
        errorCorrectionLevel: 'M',
      });

      const palette = readPalette();
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = WIDTH * ratio;
      canvas.height = HEIGHT * ratio;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas 2d 不可用');
      ctx.scale(ratio, ratio);

      // 底色 + 外框
      ctx.fillStyle = palette.bg;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, WIDTH - 6, HEIGHT - 6);

      // 顶部:站点名 + 一条主色横杠
      ctx.fillStyle = palette.accent;
      ctx.fillRect(PADDING, PADDING, 72, 8);
      ctx.fillStyle = palette.inkStrong;
      ctx.font = `700 30px ${palette.font}`;
      ctx.textBaseline = 'top';
      ctx.fillText(site.name, PADDING + 88, PADDING - 10);
      ctx.fillStyle = palette.muted;
      ctx.font = `400 18px ${palette.fontCode}`;
      ctx.fillText(site.tagline, PADDING + 88, PADDING + 26);

      // 标题
      ctx.fillStyle = palette.inkStrong;
      ctx.font = `700 46px ${palette.font}`;
      const lines = wrapText(ctx, title, WIDTH - PADDING * 2, 4);
      let cursorY = PADDING + 96;
      for (const line of lines) {
        ctx.fillText(line, PADDING, cursorY);
        cursorY += 62;
      }

      // 元信息:日期 · 阅读时长
      cursorY += 6;
      ctx.fillStyle = palette.muted;
      ctx.font = `400 20px ${palette.fontCode}`;
      ctx.fillText(
        `${formatDate(date)} · 约 ${minutes} 分钟`,
        PADDING,
        cursorY,
      );

      // 标签
      cursorY += 44;
      ctx.font = `400 20px ${palette.font}`;
      let chipX = PADDING;
      for (const tag of tags.slice(0, 3)) {
        const text = `#${tag}`;
        const width = ctx.measureText(text).width + 26;
        if (chipX + width > WIDTH - PADDING) break;
        roundRect(ctx, chipX, cursorY, width, 36, 4);
        ctx.fillStyle = palette.accent;
        ctx.fill();
        ctx.fillStyle = palette.surface;
        ctx.fillText(text, chipX + 13, cursorY + 8);
        chipX += width + 10;
      }

      // 二维码卡片
      const cardTop = HEIGHT - PADDING - 92 - qrSize - 56;
      ctx.fillStyle = palette.surface;
      roundRect(ctx, PADDING, cardTop, WIDTH - PADDING * 2, qrSize + 56, 8);
      ctx.fill();
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 3;
      ctx.stroke();

      const qrImage = new Image();
      qrImage.src = qr;
      await qrImage.decode();
      ctx.drawImage(qrImage, PADDING + 28, cardTop + 28, qrSize, qrSize);

      const infoX = PADDING + 28 + qrSize + 32;
      ctx.fillStyle = palette.inkStrong;
      ctx.font = `700 28px ${palette.font}`;
      ctx.fillText('扫码阅读全文', infoX, cardTop + 76);
      ctx.fillStyle = palette.muted;
      ctx.font = `400 17px ${palette.fontCode}`;
      const urlLines = wrapText(
        ctx,
        url.replace(/^https?:\/\//, ''),
        WIDTH - PADDING - 28 - infoX,
        3,
      );
      urlLines.forEach((line, index) => {
        ctx.fillText(line, infoX, cardTop + 124 + index * 26);
      });

      // 页脚
      ctx.fillStyle = palette.muted;
      ctx.font = `400 18px ${palette.font}`;
      ctx.fillText(
        `© ${site.since} ${site.author} · ${site.tagline}`,
        PADDING,
        HEIGHT - PADDING - 20,
      );

      setDataUrl(canvas.toDataURL('image/png'));
      setStatus('ready');
    } catch {
      setStatus('failed');
    }
  }, [title, url, date, minutes, tags]);

  // 打开面板时再画,关掉时把画布清空,省内存
  useEffect(() => {
    if (!open) {
      setStatus('idle');
      setDataUrl('');
      return;
    }
    void draw();
  }, [open, draw]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="share-btn"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        生成分享图
      </button>
      <canvas ref={canvasRef} className="share-poster-canvas" />
      {open && (
        <div
          className="share-poster-mask"
          role="dialog"
          aria-modal="true"
          aria-label="分享图"
        >
          <div className="share-poster-panel">
            <p className="share-poster-title">分享图(长按或下载后发出去)</p>
            {status === 'failed' ? (
              <p className="share-poster-hint">
                生成失败,可能是浏览器不允许 canvas
                导出;可以直接截图或改用「复制链接」。
              </p>
            ) : dataUrl ? (
              <img
                className="share-poster-image"
                src={dataUrl}
                alt="文章分享图"
              />
            ) : (
              <p className="share-poster-hint">正在生成…</p>
            )}
            <div className="share-poster-actions">
              <a
                className="share-poster-download"
                href={dataUrl || undefined}
                download={fileName}
                aria-disabled={!dataUrl}
              >
                下载图片
              </a>
              <button
                type="button"
                className="share-poster-close"
                onClick={() => setOpen(false)}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
