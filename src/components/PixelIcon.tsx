import type { StickerIconName } from '../data/stickerIcons';

type PixelSprite = string[];

const sprites = {
  star: [
    '......yy......',
    '......yy......',
    '.....yyyy.....',
    '.....yyyy.....',
    'yyyyyyyyyyyyyy',
    'yyyyyyyyyyyyyy',
    '..yyyyyyyyyy..',
    '..yyyyyyyyyy..',
    '...yyyyyyyy...',
    '...yyyyyyyy...',
    '..yyyyyyyyyy..',
    '..yyyyyyyyyy..',
    '..yyyy..yyyy..',
    '.yy........yy.',
  ],
  rocket: [
    '.....ww.....',
    '....wyyw....',
    '....wkkw....',
    '...wwyyww...',
    '...wkkkkw...',
    '...wkkkkw...',
    '...wyyyyw...',
    '..wyyyyyyw..',
    '.rrwyyyywrr.',
    '.rr.wyyw.rr.',
    '....rrrr....',
    '.....oo.....',
  ],
  heart: [
    '............',
    '..rr....rr..',
    '.rrrr..rrrr.',
    'rrrrrrrrrrrr',
    'rrrrrrrrrrrr',
    'rrrrrrrrrrrr',
    '.rrrrrrrrrr.',
    '..rrrrrrrr..',
    '...rrrrrr...',
    '....rrrr....',
    '.....rr.....',
    '............',
  ],
  ghost: [
    '....cccc....',
    '..cccccccc..',
    '.cccccccccc.',
    'cccccccccccc',
    'ccwwccccwwcc',
    'ccwkccccwkcc',
    'cccccccccccc',
    'cccccccccccc',
    'cccccccccccc',
    'cccccccccccc',
    'cccccccccccc',
    'c.cc.cc.cc.c',
  ],
  gamepad: [
    '............',
    '.bbbbbbbbbb.',
    'bbbbbbbbbbbb',
    'bbbkkbbbyybb',
    'bbbkkbbbyybb',
    'bkkkkkkbbbbb',
    'bkkkkkkbrrbb',
    'bbbkkbbbrrbb',
    'bbbkkbbbbbbb',
    'bbbbbbbbbbbb',
    '.bbbbbbbbbb.',
    '............',
  ],
  cat: [
    'kk........kk',
    'kook....kook',
    'koookkkkoook',
    'kooooooooook',
    'koowoooowook',
    'kooxooooxook',
    'kooooooooook',
    'koooorrooook',
    'koowwoowwook',
    '.kooooooook.',
    '..kkkkkkkk..',
    '............',
  ],
  mushroom: [
    '....rrrr....',
    '..rrwwrrrr..',
    '.rrwwrrwwrr.',
    'rrrrrwwrrrrr',
    'rrrrwwwwrrrr',
    'rrrrrrrrrrrr',
    '.rrrrrrrrrr.',
    '...wwwwww...',
    '...wwwwww...',
    '...wkkkkw...',
    '...wwwwww...',
    '............',
  ],
  hero: [
    '....rrrr....',
    '...rrrrrr...',
    '...nnwwnn...',
    '..nkwkkwkn..',
    '..nnnnnnnn..',
    '...nnnnnn...',
    '..bbbbbbbb..',
    '.bbbbbbbbbb.',
    'nnbwbbbbwbnn',
    '..bbbbbbbb..',
    '..rr....rr..',
    '.rrr....rrr.',
  ],
  wizard: [
    '.....mm.....',
    '....mmmm....',
    '...mmmmmm...',
    '..mmmmmmmm..',
    '.mmmmmmmmmm.',
    '...nnnnnn...',
    '..nkwkkwkn..',
    '..nnnnnnnn..',
    '..mmmmmmmm..',
    '.mmmmmmmmmm.',
    '..m......m..',
    '............',
  ],
  ninja: [
    '............',
    '..kkkkkkkk..',
    '.kkkkkkkkkk.',
    '.kkwkkkkwkk.',
    '.kkkkkkkkkk.',
    '..kkkkkkkk..',
    '..rrrrrrrr..',
    '.rrkrrrrkrr.',
    '..rrrrrrrr..',
    '..kk....kk..',
    '.kkk....kkk.',
    '............',
  ],
  knight: [
    '....dddd....',
    '...dddddd...',
    '..dddddddd..',
    '..dwddddwd..',
    '..dddddddd..',
    '...dddddd...',
    '.rrrrrrrrrr.',
    'rrrddddddrrr',
    'rr.dddddd.rr',
    '...dddddd...',
    '...rr..rr...',
    '..rrr..rrr..',
  ],
  robot: [
    '.....cc.....',
    '.....cc.....',
    '..dddddddd..',
    '.dddddddddd.',
    '.ddwwddwwdd.',
    '.dddddddddd.',
    '.dddbbbbddd.',
    '..dddddddd..',
    '.c.dddddd.c.',
    'cccddddddccc',
    '...dd..dd...',
    '..ddd..ddd..',
  ],
  slime: [
    '............',
    '............',
    '....gggg....',
    '..gggggggg..',
    '.gggggggggg.',
    'ggkgggggkggg',
    'ggkgggggkggg',
    'gggggggggggg',
    'gggggggggggg',
    '.gggggggggg.',
    '..gggggggg..',
    '...gggggg...',
  ],
  invader: [
    '............',
    '....gggg....',
    '...gggggg...',
    '..gggggggg..',
    '.gg.gggg.gg.',
    'gggggggggggg',
    'g.gggggggg.g',
    'g.g......g.g',
    '...gg..gg...',
    '..gg.gg.gg..',
    '............',
    '............',
  ],
  fighter: [
    '.....cc.....',
    '....cccc....',
    '....cccc....',
    '.cccccccccc.',
    'cccccccccccc',
    'ccwwwwwwwwcc',
    'cccccccccccc',
    '.cccccccccc.',
    '...cc..cc...',
    '..cc....cc..',
    '.c........c.',
    '............',
  ],
  sword: [
    '.....dd.....',
    '.....dw.....',
    '.....dw.....',
    '.....dw.....',
    '.....dw.....',
    '.....dw.....',
    '.....dw.....',
    '..yyyrryyy..',
    '.....oo.....',
    '.....oo.....',
    '.....yy.....',
    '............',
  ],
  shield: [
    '.dddddddddd.',
    '.dbbbbbbbbd.',
    '.dbbbyybbbd.',
    '.dyyyyyyyyd.',
    '.dbbbyybbbd.',
    '.dbbbyybbbd.',
    '..dbbyybbd..',
    '..dbbyybbd..',
    '...dbyybd...',
    '....dyyd....',
    '.....dd.....',
    '............',
  ],
  potion: [
    '.....yy.....',
    '.....yy.....',
    '....wwww....',
    '...wwwwww...',
    '..wwwwwwww..',
    '..wrrrrrrw..',
    '..wrrrrrrw..',
    '..wrrrrrrw..',
    '..wrrrrrrw..',
    '..wwwwwwww..',
    '............',
    '............',
  ],
  bomb: [
    '.........oo.',
    '........yy..',
    '.......yy...',
    '....kkkk....',
    '..kkkkkkkk..',
    '.kkkwwkkkkk.',
    '.kkwwkkkkkk.',
    '.kkkkkkkkkk.',
    '.kkkkkkkkkk.',
    '..kkkkkkkk..',
    '...kkkkkk...',
    '....kkkk....',
  ],
  chest: [
    '............',
    '..kkkkkkkk..',
    '.koyyyyyyok.',
    '.kooooooook.',
    '.kkkkkkkkkk.',
    '.kyyyyyyyyk.',
    '.koooddoook.',
    '.koooddoook.',
    '.kooooooook.',
    '..kkkkkkkk..',
    '............',
    '............',
  ],
  key: [
    '....yyyy....',
    '...oy..yy...',
    '..oy....yy..',
    '..oy....yy..',
    '...oy..yy...',
    '....yyyy....',
    '.....oy.....',
    '.....oy.....',
    '.....oyyy...',
    '.....oy.....',
    '.....oyyy...',
    '............',
  ],
  gem: [
    '............',
    '....kkkk....',
    '...kcccck...',
    '..kccwwcck..',
    '.kcccwwccck.',
    '.kcccccccck.',
    '..kcccccck..',
    '...kcccck...',
    '....kcck....',
    '.....kk.....',
    '............',
    '............',
  ],
  portal: [
    '....kkkk....',
    '..kkmmmmkk..',
    '.kmccccccmk.',
    'kmccwwwwccmk',
    'kmcwwwwwwcmk',
    'kmcwwwwwwcmk',
    'kmcwwwwwwcmk',
    'kmccwwwwccmk',
    '.kmccccccmk.',
    '..kkmmmmkk..',
    '....kkkk....',
    '............',
  ],
  trophy: [
    '............',
    '.yy......yy.',
    '.kyyyyyyyyk.',
    '.kyyyyyyyyk.',
    '..kyyyyyyk..',
    '...kyyyyk...',
    '....kyyk....',
    '.....yy.....',
    '....yyyy....',
    '....yyyy....',
    '..yyyyyyyy..',
    '............',
  ],
  joystick: [
    '............',
    '.....rr.....',
    '....rrrr....',
    '....rrrr....',
    '.....kk.....',
    '.....kk.....',
    '.....kk.....',
    '...kkkkkk...',
    '.kkkkkkkkkk.',
    '.kcccccccck.',
    '.kccyyyycck.',
    '.kkkkkkkkkk.',
  ],
} satisfies Record<string, PixelSprite>;

const expressionStickers = {
  smile: 'sticker-r02-c01',
  wink: 'sticker-r01-c01',
  laugh: 'sticker-r01-c09',
  surprised: 'sticker-r01-c12',
  love: 'sticker-r03-c03',
} as const satisfies Record<string, StickerIconName>;

const darkContrastStickers = new Set<string>([
  'sticker-r03-c12',
  'sticker-r05-c13',
  'sticker-r05-c14',
]);

export type PixelIconName =
  | keyof typeof sprites
  | keyof typeof expressionStickers
  | StickerIconName;

const ICON_SIZE = 24;

// 旧精灵按最近邻补足到统一网格；新绘制的精灵可直接使用 24×24。
function to24Sprite(sprite: PixelSprite): PixelSprite {
  if (
    sprite.length === ICON_SIZE &&
    sprite.every((row) => row.length === ICON_SIZE)
  ) {
    return sprite;
  }

  const sourceHeight = sprite.length;
  const sourceWidth = sprite[0].length;

  return Array.from({ length: ICON_SIZE }, (_, y) =>
    Array.from(
      { length: ICON_SIZE },
      (_, x) =>
        sprite[Math.floor(((y + 0.5) * sourceHeight) / ICON_SIZE)][
          Math.floor(((x + 0.5) * sourceWidth) / ICON_SIZE)
        ],
    ).join(''),
  );
}

const sprites24 = Object.fromEntries(
  Object.entries(sprites).map(([name, sprite]) => [name, to24Sprite(sprite)]),
) as Record<keyof typeof sprites, PixelSprite>;

const palette: Record<string, string> = {
  y: 'var(--gold)',
  r: 'var(--red)',
  b: 'var(--blue)',
  c: '#3cbcfc',
  g: 'var(--green)',
  k: 'var(--pixel-outline)',
  x: '#1a1c2c',
  n: '#f8b878',
  m: 'var(--pixel-purple)',
  d: '#b8b8b8',
  w: '#fffbe8',
  o: '#f87858',
};

type PixelIconProps = {
  name: PixelIconName;
};

export function PixelIcon({ name }: PixelIconProps) {
  const stickerName =
    name in expressionStickers
      ? expressionStickers[name as keyof typeof expressionStickers]
      : name.startsWith('sticker-')
        ? name
        : null;

  if (stickerName) {
    return (
      <svg
        className={
          darkContrastStickers.has(stickerName)
            ? 'sticker-needs-contrast'
            : undefined
        }
        viewBox="0 0 24 24"
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        <image
          href={`${import.meta.env.BASE_URL}icons/stickers/${stickerName}.svg?v=2`}
          x={0}
          y={0}
          width={24}
          height={24}
        />
      </svg>
    );
  }

  const sprite = sprites24[name as keyof typeof sprites];

  return (
    <svg
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
            fill={palette[match[1]]}
          />
        )),
      )}
    </svg>
  );
}
