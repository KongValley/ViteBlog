import APlayer from 'aplayer';
import { useEffect, useRef, useState } from 'react';
import 'aplayer/dist/APlayer.min.css';
import './MusicCard.css';
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

// 把 api 模板里的 :server / :type / :id 换成配置值
function metingUrl(music: MusicConfig, type: 'song'): string {
  return music.api
    .replaceAll(':server', music.server)
    .replaceAll(':type', type)
    .replaceAll(':id', music.id);
}

/**
 * 「关于本站」页的音乐卡片。
 *
 * 数据来自 Meting API(和 MetingJS 用的是同一套接口,只是不走它的自定义元素):
 * 一次请求拿回播放地址、封面、歌词,交给 APlayer(npm 包)播放。
 * 配置见 site.yml 的 music 段;没配 music 时整张卡片不渲染。
 */
export default function MusicCard() {
  const music = site.music;
  const bodyRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>({ kind: 'loading' });

  useEffect(() => {
    // site.yml 是构建期注入的静态配置,值不会变,所以依赖数组留空
    const music = site.music;
    const container = bodyRef.current;
    if (!music || !container) return;

    let player: APlayer | null = null;
    let disposed = false;
    const abort = new AbortController();

    void (async () => {
      try {
        const response = await fetch(metingUrl(music, 'song'), {
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
          // 由 MusicCard.css 用 --music-accent 接管
          loop: 'all',
          preload: 'none', // 不点播放就不下载音频
          mutex: true,
          listMaxHeight: '180px',
          storageName: 'viteblog-music',
        });
        setStatus({ kind: 'ready' });
      } catch (error) {
        if (disposed) return;
        setStatus({
          kind: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    })();

    // 离开关于页时销毁播放器:APlayer 不会自己清理 DOM 和时间轴
    return () => {
      disposed = true;
      abort.abort();
      player?.destroy();
    };
  }, []);

  if (!music) return null;

  return (
    <section className="music-card">
      <h2 className="music-card-title">正在听</h2>
      <p className="music-card-note">
        最近一直在循环的一首。换歌改 site.yml 里的 music 段即可。
      </p>
      <div className="music-card-body" ref={bodyRef} />
      {status.kind === 'loading' && (
        <p className="music-card-hint">音乐加载中…</p>
      )}
      {status.kind === 'error' && (
        <p className="music-card-hint">
          音乐加载失败:{status.message}。多半是 site.yml 里 music.api 指向的
          Meting 服务暂时不可用。
        </p>
      )}
    </section>
  );
}
