import { useEffect, useRef } from 'react';
import './EasterEggs.css';

// 经典 Konami 码:↑↑↓↓←→←→BA(字母键统一按小写比较)
const KONAMI = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
];

// 序列匹配到第 2 个键之后再也没回头路:中途的 ←/→ 不再交给页面的快捷键
const HIJACK_FROM = 2;

// 提示条停留时长(与 CSS 里的弹出动画无关,减动效下也照样显示)
const TOAST_MS = 2600;

// 彩纸方块的生命周期区间;加上最大延迟后整场动画约 3 秒
const CONFETTI_LIFE = [1800, 2600] as const;
const CONFETTI_DELAY = [0, 620] as const;
const CONFETTI_COUNT = 120;
const CONFETTI_COUNT_NARROW = 70;

// 点击迸出的方块:6-10 个,寿命短、范围小,只是点缀
const SPARK_COUNT = [6, 10] as const;
const SPARK_LIFE = [520, 780] as const;
const SPARK_DIST = [26, 68] as const;

// 颜色走主题变量,深浅色都会自动翻转;--eg-c* 由 CSS 兜底,主题可覆盖
const PALETTE = ['var(--eg-c1)', 'var(--eg-c2)', 'var(--eg-c3)'] as const;

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

// 序列里 b/a 是普通字母:输入框里的按键是打字,不算彩蛋
const TYPING_TAGS = ['INPUT', 'TEXTAREA', 'SELECT'];

/** 区间内的随机数;方块的所有参数都从区间取,集中一处好调手感 */
function rand([min, max]: readonly [number, number]): number {
  return min + Math.random() * (max - min);
}

/** 一个像素方块的起点/位移/寿命,单位与 CSS 变量一一对应 */
interface BitSpec {
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: number;
  life: number;
  delay: number;
  spin: number;
}

/**
 * 全局彩蛋:Konami 码撒彩纸 + 首页游戏机卡片点击迸粒子。
 * 自身只渲染一个 fixed 空层,不参与布局、不吃指针事件。
 */
export default function EasterEggs() {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    // 动画节点的兜底定时器:减动效偏好中途变化(或动画被 display:none 掐掉)时
    // animationend 不会触发,靠它们保证节点照样清干净
    const timers = new Set<number>();
    let toastTimer = 0;

    // 减动效偏好可能是进站前就设好的,也可能中途被改:不留缓存标志,
    // 每次触发时读一次 mq.matches,免得标志过期
    const mq = window.matchMedia(REDUCED_MOTION);

    const spawn = ({ x, y, dx, dy, size, life, delay, spin }: BitSpec) => {
      const bit = document.createElement('i');
      bit.className = 'eg-bit';
      const { style } = bit;
      style.setProperty('--eg-x', `${x}px`);
      style.setProperty('--eg-y', `${y}px`);
      style.setProperty('--eg-dx', `${dx}px`);
      style.setProperty('--eg-dy', `${dy}px`);
      style.setProperty('--eg-size', `${size}px`);
      style.setProperty('--eg-life', `${life}ms`);
      style.setProperty('--eg-delay', `${delay}ms`);
      style.setProperty('--eg-spin', `${spin}deg`);
      style.setProperty(
        '--eg-color',
        PALETTE[Math.floor(Math.random() * PALETTE.length)],
      );

      let safety = 0;
      const drop = () => {
        window.clearTimeout(safety);
        timers.delete(safety);
        bit.remove();
      };
      bit.addEventListener('animationend', drop, { once: true });
      safety = window.setTimeout(drop, delay + life + 250);
      timers.add(safety);

      layer.append(bit);
    };

    /** 彩纸:从屏幕上方撒下,落到屏幕外,约 3 秒内清空 */
    const confetti = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const count = width < 640 ? CONFETTI_COUNT_NARROW : CONFETTI_COUNT;
      for (let i = 0; i < count; i++) {
        spawn({
          x: rand([-24, width + 24]),
          y: rand([-48, -8]),
          dx: rand([-70, 70]),
          dy: height + 96,
          size: Math.round(rand([6, 14])),
          life: rand(CONFETTI_LIFE),
          delay: rand(CONFETTI_DELAY),
          spin: rand([-540, 540]),
        });
      }
    };

    /** 点击迸发:以点击点为圆心随机方向甩出几个小方块 */
    const spark = (x: number, y: number) => {
      const count = Math.round(rand(SPARK_COUNT));
      for (let i = 0; i < count; i++) {
        const angle = rand([0, Math.PI * 2]);
        const dist = rand(SPARK_DIST);
        spawn({
          x,
          y,
          dx: Math.cos(angle) * dist,
          // 略微向下坠,看起来像被重力拽了一下
          dy: Math.sin(angle) * dist + 16,
          size: Math.round(rand([5, 9])),
          life: rand(SPARK_LIFE),
          delay: rand([0, 60]),
          spin: rand([-180, 180]),
        });
      }
    };

    const showToast = (main: string, sub: string) => {
      window.clearTimeout(toastTimer);
      layer.querySelector('.eg-toast')?.remove();
      const toast = document.createElement('div');
      toast.className = 'eg-toast';
      const head = document.createElement('strong');
      head.className = 'eg-toast-main';
      head.textContent = main;
      const tail = document.createElement('span');
      tail.className = 'eg-toast-sub';
      tail.textContent = sub;
      toast.append(head, tail);
      layer.append(toast);
      toastTimer = window.setTimeout(() => toast.remove(), TOAST_MS);
    };

    let progress = 0;
    const onKeyDown = (event: KeyboardEvent) => {
      // 组合键是浏览器/系统的,Ctrl+B、Ctrl+A 之类别算进序列
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat)
        return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || TYPING_TAGS.includes(target.tagName))
      ) {
        return;
      }

      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (key === KONAMI[progress]) {
        progress += 1;
        // 序列进行中:吞掉后续按键,免得 ←/→ 同时把读者带去上一篇/下一篇
        if (progress >= HIJACK_FROM) {
          event.preventDefault();
          event.stopPropagation();
        }
        if (progress === KONAMI.length) {
          progress = 0;
          // 减动效:只弹提示,不撒彩纸
          if (!mq.matches) confetti();
          showToast('KONAMI!', 'CHEAT MODE: UNLOCKED');
        }
        return;
      }
      // 按错就从第一个键重新数(多按了几下 ↑ 再接着按也还能碰上序列)
      progress = key === KONAMI[0] ? 1 : 0;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || mq.matches) return;
      const { target } = event;
      if (!(target instanceof Element)) return;
      // 只在首页游戏机卡片上冒粒子:整页点击不加噪声,音乐挂件这类固定控件也排除
      if (!target.closest('.gb-shell') || target.closest('.music-dock')) return;
      spark(event.clientX, event.clientY);
    };

    window.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('pointerdown', onPointerDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('pointerdown', onPointerDown);
      window.clearTimeout(toastTimer);
      for (const id of timers) window.clearTimeout(id);
      timers.clear();
      // 方块与提示条都随组件走:卸载后不留任何节点
      layer.replaceChildren();
    };
  }, []);

  return <div className="eg-layer" ref={layerRef} aria-hidden="true" />;
}
