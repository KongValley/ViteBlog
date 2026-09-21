// APlayer 1.10 没有自带类型声明(npm 上也没有 @types/aplayer),
// 这里只声明本站用到的那部分 API,够用即可
declare module 'aplayer' {
  export interface APlayerAudio {
    name: string;
    artist: string;
    url: string;
    cover?: string;
    lrc?: string;
    theme?: string;
    type?: string;
  }

  export interface APlayerOptions {
    container: HTMLElement;
    audio: APlayerAudio[];
    /** 主题色(播放按钮 / 进度条 / 列表高亮) */
    theme?: string;
    loop?: 'all' | 'one' | 'none';
    order?: 'list' | 'random';
    preload?: 'auto' | 'metadata' | 'none';
    volume?: number;
    /** 同时只播放一个实例 */
    mutex?: boolean;
    listFolded?: boolean;
    listMaxHeight?: string;
    storageName?: string;
    autoplay?: boolean;
  }

  export default class APlayer {
    constructor(options: APlayerOptions);
    play(): void;
    pause(): void;
    /** 0~1;MusicDock 自己接管的音量拖动直接调它 */
    volume(value: number): void;
    destroy(): void;
    on(event: string, handler: (...args: unknown[]) => void): void;
  }
}
