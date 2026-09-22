import APlayer from 'aplayer';
import { useEffect, useRef, useState } from 'react';
import 'aplayer/dist/APlayer.min.css';
import './MusicDock.css';
import { type MusicConfig, site } from '../data/site';

// Meting 接口(type=song)返回的就是 APlayer 的曲目结构
interface MetingSong {
  name?: string;
  artist?: string;
  url?: string;
  pic?: string;
  lrc?: string;
}

type Status =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'error'; message: string };

// 收纳状态记在本地:上次收起过,下次进站还是收起的
const MINI_KEY = 'viteblog-music-mini';

function readStoredMini(): boolean {
  // 窄屏上展开的挂件会糊住内容,没记录过状态时默认收起
  if (window.matchMedia('(max-width: 560px)').matches) {
    try {
      const stored = localStorage.getItem(MINI_KEY);
      if (stored !== '1' && stored !== '0') return true;
    } catch {
      return true;
    }
  }
  try {
    return localStorage.getItem(MINI_KEY) === '1';
  } catch {
    // 隐私模式下 localStorage 会抛错,按展开处理
    return false;
  }
}

// 把 api 模板里的 :server / :type / :id 换成配置值
// (type=song 返回一首,type=playlist 返回整张歌单)
function metingUrl(music: MusicConfig): string {
  return music.api
    .replaceAll(':server', music.server)
    .replaceAll(':type', music.type)
    .replaceAll(':id', music.id);
}

/**
 * 自己接管音量交互。
 *
 * APlayer 的音量条只在 :hover 时展开,取值又是拿累加 offsetTop 的结果去减 clientY ——
 * 挂件是 fixed 定位,算出来的位置差几像素,拖到底也降不到 0。所以这里用指针事件重做一遍:
 *   点一下音量图标 → 先把音量条钉住(否则 :hover 一离开就收回);
 *   在音量条上按住拖动 → 用 getBoundingClientRect 换算音量,鼠标 / 手指 / 触控笔一致。
 * 捕获阶段拦掉 APlayer 自己的 mousedown / touchstart,免得两套逻辑互相打架。
 *
 * 注:触屏设备上整个音量控件已被 MusicDock.css 的 @media (hover: none) 隐藏(手机音量交给系统键),
 * 这套交互因此只服务有 hover 的设备;apply() 里的 rect.height === 0 守卫也保证了
 * 控件处于隐藏态时被误调用不会把音量算成 NaN。
 */
function bindVolume(container: HTMLElement, player: APlayer): () => void {
  const wrap = container.querySelector<HTMLElement>('.aplayer-volume-wrap');
  const barWrap = container.querySelector<HTMLElement>(
    '.aplayer-volume-bar-wrap',
  );
  const bar = container.querySelector<HTMLElement>('.aplayer-volume-bar');
  if (!wrap || !barWrap || !bar) return () => {};

  const apply = (clientY: number) => {
    const rect = bar.getBoundingClientRect();
    if (rect.height === 0) return;
    const ratio = (rect.bottom - clientY) / rect.height;
    player.volume(Math.min(1, Math.max(0, ratio)));
  };

  const inVolume = (target: EventTarget | null): Element | null =>
    target instanceof Element ? target.closest('.aplayer-volume-wrap') : null;

  const blockAPlayer = (event: Event) => {
    if (inVolume(event.target)) event.stopPropagation();
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (!inVolume(event.target)) return;
    // 点在图标上:只把音量条亮出来,别顺手改音量
    if (!(event.target as Element).closest('.aplayer-volume-bar-wrap')) {
      wrap.classList.add('volume-open');
      return;
    }

    event.preventDefault();
    wrap.classList.add('volume-open');
    barWrap.classList.add('aplayer-volume-bar-wrap-active');
    apply(event.clientY);

    const onMove = (moveEvent: PointerEvent) => apply(moveEvent.clientY);
    const stop = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      barWrap.classList.remove('aplayer-volume-bar-wrap-active');
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
  };

  // 点别处把临时展开的音量条收回去
  const onPointerElsewhere = (event: PointerEvent) => {
    if (!inVolume(event.target)) wrap.classList.remove('volume-open');
  };

  container.addEventListener('mousedown', blockAPlayer, true);
  container.addEventListener('touchstart', blockAPlayer, true);
  container.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointerdown', onPointerElsewhere);

  return () => {
    container.removeEventListener('mousedown', blockAPlayer, true);
    container.removeEventListener('touchstart', blockAPlayer, true);
    container.removeEventListener('pointerdown', onPointerDown);
    document.removeEventListener('pointerdown', onPointerElsewhere);
  };
}

/**
 * 贴边音乐挂件:固定在左下角,可以收成一张封面方块贴在屏幕边缘。
 *
 * 数据来自 Meting API(和 MetingJS 用的是同一套接口,只是不走它的自定义元素):
 * 一次请求拿回播放地址、封面、歌词,交给 APlayer(npm 包)播放。
 * 配置见 site.yml 的 music 段;没配 music 时整个挂件不渲染。
 *
 * 挂在 App 上而不是「关于本站」页:固定层的东西跟路由走,切页面音乐就断了。
 */
export default function MusicDock() {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [mini, setMini] = useState(readStoredMini);

  useEffect(() => {
    // site.yml 是构建期注入的静态配置,值不会变,所以依赖数组留空
    const music = site.music;
    const container = bodyRef.current;
    if (!music || !container) return;

    let player: APlayer | null = null;
    let unbindVolume: (() => void) | null = null;
    let disposed = false;
    const abort = new AbortController();

    void (async () => {
      try {
        const response = await fetch(metingUrl(music), {
          signal: abort.signal,
        });
        if (!response.ok) {
          throw new Error(`接口返回 HTTP ${response.status}`);
        }
        const list = (await response.json()) as MetingSong[];
        const audio = (Array.isArray(list) ? list : [])
          .filter((song) => typeof song?.url === 'string' && song.url !== '')
          .map((song) => ({
            name: song.name?.trim() || '未知曲目',
            artist: song.artist?.trim() || '',
            url: song.url ?? '',
            cover: song.pic ?? '',
            lrc: song.lrc ?? '',
          }));
        if (audio.length === 0) {
          throw new Error('接口没有返回可播放的曲目');
        }
        if (disposed) return;

        player = new APlayer({
          container,
          audio,
          // 主题色不走这里的 theme 选项(它是内联样式,切深浅色不会刷新),
          // 由 MusicDock.css 用 --music-accent 接管
          loop: 'all',
          preload: 'none', // 不点播放就不下载音频
          mutex: true,
          // 歌单默认收起来:挂件保持一条控制条的高度,点列表图标再展开
          listFolded: true,
          listMaxHeight: '180px',
          storageName: 'viteblog-music',
        });
        unbindVolume = bindVolume(container, player);
        setStatus({ kind: 'ready' });
      } catch (error) {
        if (disposed) return;
        setStatus({
          kind: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    })();

    // 卸载时销毁播放器:APlayer 不会自己清理 DOM 和时间轴
    return () => {
      disposed = true;
      abort.abort();
      unbindVolume?.();
      player?.destroy();
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(MINI_KEY, mini ? '1' : '0');
    } catch {
      // 存不了就只在本次会话里生效
    }
  }, [mini]);

  if (!site.music) return null;

  // 播放器没加载出来时(加载中 / 失败)别缩成空壳:收起状态只在真的有播放器时才算数
  const collapsed = mini && status.kind === 'ready';

  return (
    <section className={`music-dock${collapsed ? ' music-dock--mini' : ''}`}>
      {status.kind === 'ready' && (
        <button
          type="button"
          className="music-dock-toggle"
          aria-expanded={!collapsed}
          aria-label={collapsed ? '展开播放器' : '收起播放器'}
          title={collapsed ? '展开播放器' : '收起播放器'}
          onClick={() => setMini((value) => !value)}
        >
          <span aria-hidden="true">{collapsed ? '▶' : '◀'}</span>
        </button>
      )}
      <div className="music-dock-body" ref={bodyRef} />
      {status.kind === 'loading' && (
        <p className="music-dock-hint">音乐加载中…</p>
      )}
      {status.kind === 'error' && (
        <p className="music-dock-hint">
          音乐加载失败:{status.message}。多半是 site.yml 里 music.api 指向的
          Meting 服务暂时不可用。
        </p>
      )}
    </section>
  );
}
