// 社交胶囊上的小图标
//
// 两种渲染模式:
//   默认    → 线性 SVG,细线条,适配大多数主题
//   像素模式 → 用像素精灵画的图标,配合 pixel 主题的红白机气质
//              (在 site.yml 选了 pixel 主题时自动启用)
//
// 颜色一律用 currentColor,胶囊悬停变色时图标自动跟着变。
// 像素精灵的画法与 PixelIcon.tsx 一致:字符网格 + 行程合并成 <rect>。

import { site } from '../data/site';

const IS_PIXEL_THEME = site.theme === 'pixel';

const ICON_SIZE = 15;

type PixelSprite = string[];

// GitHub 章鱼猫:由 Simple Icons 官方路径光栅化成 16×16(实心剪影,墨点占比 44%)
const GITHUB_SPRITE: PixelSprite = [
  '......kkkk......',
  '....kkkkkkkk....',
  '..kkkkkkkkkkkk..',
  '..kkkkkkkkkkkk..',
  '.kkk........kkk.',
  'kkkk........kkk.',
  'kkk..........kkk',
  'kkk..........kkk',
  'kkk..........kkk',
  'kkk..........kkk',
  'kkkk........kkkk',
  '.kkkk.....kkkkk.',
  '.kk.kk....kkkkk.',
  '..kk......kkkk..',
  '...kkk....kkk...',
  '.....k....k.....',
];

// 通用地球(个人网站)
const GLOBE_SPRITE: PixelSprite = [
  '.....kkkk.......',
  '...kk....kk.....',
  '..k........k....',
  '.k...kkkkkk.k...',
  '.k..k......k....',
  'k..k.kkkkkk.kk..',
  'k.k.k......k.k..',
  'k.k.k..kk..k.k..',
  'k.k.k..kk..k.k..',
  'k.k.k......k.k..',
  'k..k.kkkkkk.kk..',
  '.k..k......k....',
  '.k...kkkkkk.k...',
  '..k........k....',
  '...kk....kk.....',
  '.....kkkk.......',
];

const SPRITES = { github: GITHUB_SPRITE, globe: GLOBE_SPRITE } as const;

// 像素精灵 → <rect> 行程(横向上相邻同色像素合并,减少节点数)
function PixelSpriteSvg({ sprite }: { sprite: PixelSprite }) {
  return (
    <svg
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox={`0 0 ${ICON_SIZE} ${ICON_SIZE}`}
      fill="none"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {sprite.flatMap((row, y) =>
        Array.from(row.matchAll(/([a-z])\1*/g), (match) => (
          <rect
            // biome-ignore lint/suspicious/noArrayIndexKey: 精灵像素是纯静态内容,按坐标生成 key 稳定且永不重排
            key={`${match.index}-${y}`}
            x={match.index}
            y={y}
            width={match[0].length}
            height={1}
            fill="currentColor"
          />
        )),
      )}
    </svg>
  );
}

// GitHub 官方标记(线性版,Octicons 风格路径)
function GithubMark() {
  return (
    <svg
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

// 通用地球(线性版)
function GlobeIcon() {
  return (
    <svg
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

type SocialIconProps = {
  name: string;
  url: string;
};

export function SocialIcon({ name, url }: SocialIconProps) {
  const haystack = `${name} ${url}`.toLowerCase();
  const kind = haystack.includes('github') ? 'github' : 'globe';

  if (IS_PIXEL_THEME) {
    return <PixelSpriteSvg sprite={SPRITES[kind]} />;
  }
  return kind === 'github' ? <GithubMark /> : <GlobeIcon />;
}
