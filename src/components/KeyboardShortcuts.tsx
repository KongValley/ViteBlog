import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { adjacentPosts, getPostBySlug } from '../data/posts';
import './KeyboardShortcuts.css';

// 速查面板的内容。和下面 switch 里的分支一一对应,加删快捷键时两边一起改。
const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['/'], label: '打开搜索页并聚焦搜索框' },
  { keys: ['?'], label: '打开 / 关闭这个速查面板' },
  { keys: ['Esc'], label: '关闭速查面板;在搜索页清空搜索框' },
  { keys: ['h'], label: '回到首页' },
  { keys: ['t'], label: '标签页' },
  { keys: ['c'], label: '分类页' },
  { keys: ['a'], label: '归档页' },
  { keys: ['b'], label: '回到页面顶部' },
  { keys: ['←', '→'], label: '文章页:较新一篇 / 较早一篇' },
];

// 这几个 input 类型不是「打字」,落在它们上面时快捷键照样生效
const NON_TEXT_INPUTS: Record<string, boolean> = {
  button: true,
  checkbox: true,
  color: true,
  file: true,
  hidden: true,
  radio: true,
  range: true,
  reset: true,
  submit: true,
};

// 搜索页的输入框。约定死的选择器:搜索页换实现时这里一起改
const SEARCH_INPUT = 'input[type="search"]';

/** 焦点在输入框 / 可编辑区域里时,按键是打字,不能当快捷键吃 */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag !== 'INPUT') return false;
  return NON_TEXT_INPUTS[(target as HTMLInputElement).type] !== true;
}

// 把焦点放进搜索框。搜索页可能是懒加载的,路由切过去时它还没挂上,
// 所以先用 MutationObserver 等它出现在 DOM 里(比按帧重试可靠:
// 后台标签页里 requestAnimationFrame 会被节流甚至不触发),最多等两秒。
function focusSearchInput() {
  const focus = () => {
    const input = document.querySelector<HTMLInputElement>(SEARCH_INPUT);
    if (!input) return false;
    input.focus();
    input.select();
    return true;
  };

  if (focus()) return;

  const observer = new MutationObserver(() => {
    if (focus()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 2000);
}

// Esc 清空搜索框。搜索框是受控组件(值在 React state 里),
// 直接改 DOM 的 value 只在视觉上清空、state 还留着旧值,
// 所以走原生 setter 再补一个 input 事件,让 React 自己收下这次修改。
function clearSearchInput(): boolean {
  const input = document.querySelector<HTMLInputElement>(SEARCH_INPUT);
  if (!input || input.value === '') return false;
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set;
  setter?.call(input, '');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

/** 从当前地址里取文章 slug(路由是 /post/*,slug 本身可能带 /) */
function postSlug(pathname: string): string {
  const prefix = '/post/';
  if (!pathname.startsWith(prefix)) return '';
  return decodeURIComponent(pathname.slice(prefix.length)).replace(/\/+$/, '');
}

/** 全局快捷键。没有常驻 UI,只有按 ? 时才浮出速查面板。 */
export default function KeyboardShortcuts() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  // 面板打开时把焦点交给关闭按钮(键盘用户不用先摸 Tab),
  // 但不做焦点陷阱:Tab 仍能照常走出面板。
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  useEffect(() => {
    // 导航类快捷键顺手关掉面板,免得它盖住刚跳过去的页面
    const go = (path: string) => {
      setOpen(false);
      navigate(path);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      // 别人已经处理掉的按键(比如彩蛋的 Konami 序列)就别再抢
      if (event.defaultPrevented) return;
      // Meta / Ctrl / Alt 组合留给浏览器(新标签打开、刷新、复制…),一律不拦
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      // Esc 放在「正在打字」判断之前:搜索框里也要能用它清空
      if (event.key === 'Escape') {
        if (open) {
          event.preventDefault();
          setOpen(false);
        } else if (clearSearchInput()) {
          event.preventDefault();
        }
        return;
      }

      if (isTyping(event.target)) return;
      // 长按不重复触发,否则会连着跳好几篇
      if (event.repeat) return;

      switch (event.key) {
        case '/':
          event.preventDefault();
          setOpen(false);
          navigate('/search');
          focusSearchInput();
          return;
        case '?':
          event.preventDefault();
          setOpen((value) => !value);
          return;
        case 'h':
          event.preventDefault();
          go('/');
          return;
        case 't':
          event.preventDefault();
          go('/tags');
          return;
        case 'c':
          event.preventDefault();
          go('/categories');
          return;
        case 'a':
          event.preventDefault();
          go('/archive');
          return;
        case 'b':
          event.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        case 'ArrowLeft':
        case 'ArrowRight': {
          // Shift + 方向键是选文字,不抢
          if (event.shiftKey) return;
          const slug = postSlug(pathname);
          if (!slug || !getPostBySlug(slug)) return;
          const { prev, next } = adjacentPosts(slug);
          // 方向和文章页底部的排版一致:左边那块(较新)对应 ←,右边那块(较早)对应 →
          const target = event.key === 'ArrowLeft' ? next : prev;
          if (!target) return;
          event.preventDefault();
          navigate(`/post/${target.slug}`);
          return;
        }
        default:
          return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate, open, pathname]);

  if (!open) return null;

  return (
    <>
      {/* 铺满屏幕的遮罩,点一下就关。用按钮是因为它就干这个:
          不做焦点陷阱,也不进 Tab 序列(tabIndex=-1) */}
      <button
        type="button"
        className="kbd-help-backdrop"
        tabIndex={-1}
        aria-label="关闭快捷键面板"
        onClick={() => setOpen(false)}
      />
      <div
        className="kbd-help"
        role="dialog"
        aria-modal="false"
        aria-label="键盘快捷键"
      >
        <div className="kbd-help-panel">
          <div className="kbd-help-head">
            <p className="kbd-help-title">键盘快捷键</p>
            <button
              ref={closeRef}
              type="button"
              className="kbd-help-close"
              aria-label="关闭快捷键面板"
              title="关闭(Esc)"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </div>

          <ul className="kbd-help-list">
            {SHORTCUTS.map((item) => (
              <li key={item.label} className="kbd-help-row">
                <span className="kbd-help-keys">
                  {item.keys.map((key) => (
                    <kbd key={key} className="kbd-help-key">
                      {key}
                    </kbd>
                  ))}
                </span>
                <span className="kbd-help-text">{item.label}</span>
              </li>
            ))}
          </ul>

          <p className="kbd-help-hint">
            输入框、可编辑区域里不触发;带 Ctrl / ⌘ 的组合交给浏览器。
          </p>
        </div>
      </div>
    </>
  );
}
