import { useCallback, useEffect, useRef, useState } from 'react';
import { formatDate } from '../data/format';
import { site } from '../data/site';
import { wrapText } from './canvasText';
import './SharePoster.css';

type Props = {
  title: string;
  /** 相对站点 base 的路径,如 /post/xxx */
  path: string;
  /** 文章元信息,画在海报上 */
  date: string;
  minutes: number;
  tags: string[];
  /** 封面图(可选):有就铺在标题上方,像公众号分享卡;跨域取不到时自动退回无封面版 */
  cover?: string;
  /** 摘录(可选):标题下面引一段正文,像公众号的摘要 */
  excerpt?: string;
  /** 文章小标题(可选):摘录下面给一份内容概览 */
  outline?: string[];
};

const WIDTH = 800;
const BASE_HEIGHT = 1120;
/** 有封面时封面图占的高度(整幅通栏) */
const COVER_HEIGHT = 380;
/** 摘录:字形与行高,最多三行(超了省略号收尾) */
const EXCERPT_SIZE = 22;
const EXCERPT_LINE_HEIGHT = 34;
const EXCERPT_MAX_LINES = 3;
/** 概览:标题 + 几行小标题,每个小标题压成一行 */
const OUTLINE_SIZE = 19;
const OUTLINE_LINE_HEIGHT = 30;
const OUTLINE_MAX_ITEMS = 4;
const OUTLINE_LABEL_HEIGHT = 34;
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
  cover,
  excerpt,
  outline,
}: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'drawing' | 'ready' | 'failed'>(
    'idle',
  );
  const [dataUrl, setDataUrl] = useState('');
  // 封面图跨域拿不到时(OSS 没开 CORS),退回无封面版并在面板上说明
  const [coverDropped, setCoverDropped] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const url = `${location.origin}${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
  const fileName = `${site.name}-${title.slice(0, 20).replace(/[\\/:*?"<>|\s]/g, '')}.png`;

  const draw = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setStatus('drawing');
    setCoverDropped(false);

    // 封面图:跨域图必须带 crossOrigin 拉,否则画进 canvas 会把画布标脏、导出直接抛异常。
    // OSS 没开 CORS 时这里会失败,那就退回无封面版(并标记出来在面板上说明)。
    const loadCover = async (): Promise<HTMLImageElement | null> => {
      if (!cover) return null;
      try {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.src = cover;
        await image.decode();
        return image;
      } catch {
        return null;
      }
    };

    const paint = async (
      coverImage: HTMLImageElement | null,
    ): Promise<string> => {
      // 动态 import 是刻意的:二维码库只有点「生成分享图」时才需要,别让它进主包
      const { default: QRCode } = await import('qrcode');
      await document.fonts.ready;

      const qrSize = 280;
      const qr = await QRCode.toDataURL(url, {
        width: qrSize,
        margin: 1,
        errorCorrectionLevel: 'M',
      });

      const coverHeight = coverImage ? COVER_HEIGHT : 0;
      const palette = readPalette();
      // 摘录占几行要先量出来:画布一旦按某个高度建好,再想加高度就得重画
      const quote = (excerpt ?? '').trim();
      const measure = canvas.getContext('2d');
      if (measure) measure.font = `400 ${EXCERPT_SIZE}px ${palette.font}`;
      const quoteLines =
        quote && measure
          ? wrapText(
              measure,
              quote,
              WIDTH - PADDING * 2 - 24,
              EXCERPT_MAX_LINES,
            )
          : [];
      const quoteHeight = quoteLines.length
        ? quoteLines.length * EXCERPT_LINE_HEIGHT + 18
        : 0;
      // 概览同理:每行都要量出实际宽度,超宽的一行用省略号收
      if (measure) measure.font = `400 ${OUTLINE_SIZE}px ${palette.font}`;
      const outlineItems =
        measure && outline && outline.length >= 2
          ? outline
              .slice(0, OUTLINE_MAX_ITEMS)
              .map(
                (item) =>
                  wrapText(measure, item, WIDTH - PADDING * 2 - 22, 1)[0],
              )
          : [];
      const outlineHeight = outlineItems.length
        ? outlineItems.length * OUTLINE_LINE_HEIGHT + OUTLINE_LABEL_HEIGHT + 14
        : 0;
      const height = BASE_HEIGHT + coverHeight + quoteHeight + outlineHeight;
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = WIDTH * ratio;
      canvas.height = height * ratio;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas 2d 不可用');
      ctx.scale(ratio, ratio);

      // 底色 + 外框
      ctx.fillStyle = palette.bg;
      ctx.fillRect(0, 0, WIDTH, height);
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, WIDTH - 6, height - 6);

      // 封面:通栏铺在顶部,按 object-fit: cover 的方式裁切,不变形
      if (coverImage) {
        const scale = Math.max(
          WIDTH / coverImage.width,
          coverHeight / coverImage.height,
        );
        const sourceWidth = WIDTH / scale;
        const sourceHeight = coverHeight / scale;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, WIDTH, coverHeight);
        ctx.clip();
        ctx.drawImage(
          coverImage,
          (coverImage.width - sourceWidth) / 2,
          (coverImage.height - sourceHeight) / 2,
          sourceWidth,
          sourceHeight,
          0,
          0,
          WIDTH,
          coverHeight,
        );
        ctx.restore();
        ctx.strokeStyle = palette.line;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, coverHeight + 1.5);
        ctx.lineTo(WIDTH, coverHeight + 1.5);
        ctx.stroke();
      }

      // 顶部:站点名 + 一条主色横杠
      ctx.fillStyle = palette.accent;
      ctx.fillRect(PADDING, coverHeight + PADDING, 72, 8);
      ctx.fillStyle = palette.inkStrong;
      ctx.font = `700 30px ${palette.font}`;
      ctx.textBaseline = 'top';
      ctx.fillText(site.name, PADDING + 88, coverHeight + PADDING - 10);
      ctx.fillStyle = palette.muted;
      ctx.font = `400 18px ${palette.fontCode}`;
      ctx.fillText(site.tagline, PADDING + 88, coverHeight + PADDING + 26);

      // 标题
      ctx.fillStyle = palette.inkStrong;
      ctx.font = `700 46px ${palette.font}`;
      const lines = wrapText(ctx, title, WIDTH - PADDING * 2, 4);
      let cursorY = coverHeight + PADDING + 96;
      for (const line of lines) {
        ctx.fillText(line, PADDING, cursorY);
        cursorY += 62;
      }

      // 摘录:左侧一道主色竖线 + 最多三行正文(行已在上方量好)
      if (quoteLines.length > 0) {
        const quoteTop = cursorY + 8;
        ctx.font = `400 ${EXCERPT_SIZE}px ${palette.font}`;
        ctx.fillStyle = palette.accent;
        ctx.fillRect(
          PADDING,
          quoteTop + 4,
          4,
          quoteLines.length * EXCERPT_LINE_HEIGHT - 12,
        );
        ctx.fillStyle = palette.muted;
        quoteLines.forEach((line, index) => {
          ctx.fillText(
            line,
            PADDING + 20,
            quoteTop + index * EXCERPT_LINE_HEIGHT,
          );
        });
        cursorY = quoteTop + quoteLines.length * EXCERPT_LINE_HEIGHT;
      }

      // 概览:标题 + 最多四行小标题
      if (outlineItems.length > 0) {
        cursorY += 12;
        ctx.font = `700 ${OUTLINE_SIZE}px ${palette.font}`;
        ctx.fillStyle = palette.accent;
        ctx.fillText('概览', PADDING, cursorY);
        cursorY += OUTLINE_LABEL_HEIGHT;
        ctx.font = `400 ${OUTLINE_SIZE}px ${palette.font}`;
        for (const item of outlineItems) {
          ctx.fillStyle = palette.accent;
          ctx.globalAlpha = 0.75;
          ctx.fillRect(PADDING + 2, cursorY + 8, 8, 8);
          ctx.globalAlpha = 1;
          ctx.fillStyle = palette.muted;
          ctx.fillText(item, PADDING + 22, cursorY);
          cursorY += OUTLINE_LINE_HEIGHT;
        }
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
      const cardTop = height - PADDING - 92 - qrSize - 56;
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
        height - PADDING - 20,
      );

      return canvas.toDataURL('image/png');
    };

    try {
      const coverImage = await loadCover();
      // 有封面却拿不到(多半是图床没给 CORS)时,面板上说明一句,免得用户以为封面被吃了
      if (cover && !coverImage) setCoverDropped(true);
      let output: string;
      try {
        output = await paint(coverImage);
      } catch (error) {
        // 封面虽然解码成功、但画布被标脏(toDataURL 抛 SecurityError)时,退回无封面版
        if (!coverImage) throw error;
        output = await paint(null);
        setCoverDropped(true);
      }
      setDataUrl(output);
      setStatus('ready');
    } catch {
      setStatus('failed');
    }
  }, [title, url, date, minutes, tags, cover, excerpt, outline]);

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
            {coverDropped && (
              <p className="share-poster-hint">
                封面图跨域取不到,已生成无封面版本(给图床开一条 CORS
                规则即可带上封面)。
              </p>
            )}
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
