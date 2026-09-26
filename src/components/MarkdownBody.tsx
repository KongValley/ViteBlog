import {
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import './MarkdownBody.css';

type Props = {
  html: string;
  /** 正文区域的点击回调(文章页用它把站内链接改成 SPA 跳转) */
  onClick?: (event: ReactMouseEvent<HTMLDivElement>) => void;
};

// 渲染后的正文需要几件运行期的事:
//   1. 代码块复制按钮(事件代理,一份监听管住全文)
//   2. KaTeX 公式 / Mermaid 图表 —— 都按需 dynamic import,没用到就不进包
//   3. 图片灯箱(点开大图,Esc / 点遮罩关闭)
export default function MarkdownBody({ html, onClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<{ src: string; alt: string } | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: html 变化会重建 DOM 节点,必须重新挂监听与渲染公式/图表
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;

    const handleCopy = async (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
        '.code-copy',
      );
      if (!button) return;
      // 行与行之间没有换行文本节点(见 markdown.ts 里 join('') 的说明),复制时自己按行拼回来
      const block = button.closest('.code-block');
      const code = block
        ? [...block.querySelectorAll('.code-line')]
            .map((line) => line.textContent ?? '')
            .join('\n')
        : '';
      if (!code) return;
      try {
        await navigator.clipboard.writeText(code);
        button.textContent = '已复制';
        button.dataset.copied = 'true';
      } catch {
        button.textContent = '复制失败';
      }
      window.setTimeout(() => {
        button.textContent = '复制';
        button.dataset.copied = 'false';
      }, 1400);
    };

    const handleZoom = (event: MouseEvent) => {
      const image = (event.target as HTMLElement).closest<HTMLImageElement>(
        'img.post-image, img',
      );
      if (!image || !container.contains(image)) return;
      // 灯箱按钮、封面等带 data-no-zoom 的图不参与
      if (image.dataset.noZoom === 'true') return;
      setZoom({ src: image.currentSrc || image.src, alt: image.alt });
    };

    container.addEventListener('click', handleCopy);
    container.addEventListener('click', handleZoom);

    const renderMath = async () => {
      const targets = container.querySelectorAll<HTMLElement>('[data-tex]');
      if (targets.length === 0) return;
      // 动态 import 是刻意的:KaTeX 与它的 CSS 各有几百 KB,只有正文真的出现公式时才该下载;
      // 静态 import 会打进文章页 chunk,每篇文章都要背这份开销。
      const [{ default: katex }] = await Promise.all([
        import('katex'),
        import('katex/dist/katex.min.css'),
      ]);
      if (disposed) return;
      for (const target of targets) {
        katex.render(target.dataset.tex ?? '', target, {
          displayMode: target.classList.contains('math-block'),
          throwOnError: false,
          strict: false,
        });
      }
    };

    const renderDiagrams = async () => {
      const targets = container.querySelectorAll<HTMLElement>('.mermaid');
      if (targets.length === 0) return;
      // 同上:mermaid 本体 + 各图表类型解析器体积很大,按需加载
      const { default: mermaid } = await import('mermaid');
      if (disposed) return;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'loose',
        theme:
          document.documentElement.dataset.theme === 'dark'
            ? 'dark'
            : 'neutral',
      });
      let index = 0;
      for (const target of targets) {
        const source = target.dataset.source ?? '';
        if (!source) continue;
        try {
          const { svg } = await mermaid.render(
            `mermaid-${Date.now()}-${index}`,
            source,
          );
          index += 1;
          if (disposed) return;
          target.innerHTML = svg;
          target.classList.add('mermaid-rendered');
        } catch {
          // 语法写错时保留原文,方便直接在页面上看出问题
          target.classList.add('mermaid-failed');
        }
      }
    };

    void renderMath();
    void renderDiagrams();

    return () => {
      disposed = true;
      container.removeEventListener('click', handleCopy);
      container.removeEventListener('click', handleZoom);
    };
  }, [html]);

  // 灯箱打开时锁滚动,并支持 Esc 关闭
  useEffect(() => {
    if (!zoom) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setZoom(null);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [zoom]);

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: 事件代理只拦截正文里的站内链接做 SPA 跳转,链接本身天然可键盘访问 */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: 键盘 Enter 触发链接的原生 click 同样会冒泡到这里,无需单独的 keydown */}
      <div
        ref={containerRef}
        className="markdown-body"
        onClick={onClick}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: 正文是仓库内自己写的 Markdown,来源可控
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {zoom && (
        <button
          type="button"
          className="image-zoom"
          onClick={() => setZoom(null)}
          aria-label="关闭大图"
        >
          <img src={zoom.src} alt={zoom.alt} />
          <span className="image-zoom-hint">点击任意处关闭(Esc)</span>
        </button>
      )}
    </>
  );
}
