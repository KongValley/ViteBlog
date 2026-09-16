type PixelSprite = string[]

const sprites = {
  star: [
    '.....yy.....',
    '.....yy.....',
    '....yyyy....',
    'yyyyyyyyyyyy',
    '.yyyyyyyyyy.',
    '..yyyyyyyy..',
    '...yyyyyy...',
    '...yyyyyy...',
    '..yy....yy..',
    '.yy......yy.',
    'y..........y',
    '............',
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
  smile: [
    '...yyyyyy...',
    '..yyyyyyyy..',
    '.yyyyyyyyyy.',
    'yyyyyyyyyyyy',
    'yykkyyyykkyy',
    'yykkyyyykkyy',
    'yyyyyyyyyyyy',
    'yykkkkkkkkyy',
    'yyykkkkkkyyy',
    '.yyyyyyyyyy.',
    '..yyyyyyyy..',
    '...yyyyyy...',
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
    '............',
    '.bbbbbbbbbb.',
    'bbbbbbbbbbbb',
    'bbwbbbbbbwbb',
    'bbwwwbbbywbb',
    'bbbbbbbyyybb',
    'bbbbbbbbbbbb',
    '.bbbbbbbbbb.',
    '............',
    '............',
    '............',
  ],
  lightning: [
    '......yyy...',
    '.....yyy....',
    '....yyy.....',
    '...yyyyyy...',
    '....yyyy....',
    '...yyyy.....',
    '..yyyy......',
    '.yyyy.......',
    '.yy.........',
    'yy..........',
    '............',
    '............',
  ],
  coin: [
    '...yyyyyy...',
    '..yyyyyyyy..',
    '.yyyyyyyyyy.',
    '.yykkkkkkyy.',
    'yyykkwwkkyyy',
    'yyykkwwkkyyy',
    'yyykkkkkkyyy',
    'yyykkkkkkyyy',
    '.yykkkkkkyy.',
    '.yyyyyyyyyy.',
    '..yyyyyyyy..',
    '...yyyyyy...',
  ],
  cat: [
    'kk........kk',
    'kkk......kkk',
    '.kkkkkkkkkk.',
    'kkkkkkkkkkkk',
    'kkokkkkkokkk',
    'kkokkkkkokkk',
    'kkkkkkkkkkkk',
    'kkkookoookkk',
    '.kkkkkkkkkk.',
    '..kkkkkkkk..',
    '............',
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
} satisfies Record<string, PixelSprite>

export type PixelIconName = keyof typeof sprites

const palette: Record<string, string> = {
  y: 'var(--gold)',
  r: 'var(--red)',
  b: 'var(--blue)',
  c: '#3cbcfc',
  g: 'var(--green)',
  k: '#1a1c2c',
  w: '#fffbe8',
  o: '#f87858',
}

type PixelIconProps = {
  name: PixelIconName
}

export function PixelIcon({ name }: PixelIconProps) {
  const sprite = sprites[name]

  return (
    <svg
      viewBox={`0 0 ${sprite[0].length} ${sprite.length}`}
      fill="none"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {sprite.flatMap((row, y) =>
        row.split('').map((pixel, x) =>
          pixel === '.' ? null : (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={palette[pixel]} />
          ),
        ),
      )}
    </svg>
  )
}
