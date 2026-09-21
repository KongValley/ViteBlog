import {
  ICON_SIZE,
  pixelPalette,
  type SpriteName,
  sprites24,
} from '../data/pixelSprites';
import { expressionStickers } from '../data/postIcons';
import type { StickerIconName } from '../data/stickerIcons';

const darkContrastStickers = new Set<string>([
  'sticker-r03-c12',
  'sticker-r05-c13',
  'sticker-r05-c14',
]);

export type PixelIconName =
  | SpriteName
  | keyof typeof expressionStickers
  | StickerIconName;

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

  const sprite = sprites24[name as SpriteName];

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
            fill={pixelPalette[match[1]]}
          />
        )),
      )}
    </svg>
  );
}
