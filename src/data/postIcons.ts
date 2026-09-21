// 每篇文章的像素图标:首页卡片图标与构建期生成的封面共用这一套挑选规则,
// 于是同一篇文章在首页和封面/文章头图上看到的是同一个图案。
//
// 纯数据 + 纯函数,不碰 import.meta.env 之类 vite 专有的东西 ——
// 构建脚本(scripts/build-covers.mjs)要能直接用 node 导入它。

import type { PixelIconName } from '../components/PixelIcon';
import { stickerIcons } from './stickerIcons.ts';

/** 表情类的几个名字直接指向贴纸文件;其余手绘精灵在组件里用像素字符画渲染 */
export const expressionStickers = {
  smile: 'sticker-r02-c01',
  wink: 'sticker-r01-c01',
  laugh: 'sticker-r01-c09',
  surprised: 'sticker-r01-c12',
  love: 'sticker-r03-c03',
} as const satisfies Record<string, string>;

/** 可选图标池:手绘精灵在前(辨识度高),后面跟着全部贴纸 */
const postIcons: PixelIconName[] = [
  'star',
  'rocket',
  'smile',
  'wink',
  'laugh',
  'surprised',
  'love',
  'heart',
  'ghost',
  'gamepad',
  'cat',
  'mushroom',
  'hero',
  'wizard',
  'ninja',
  'knight',
  'robot',
  'slime',
  'invader',
  'fighter',
  'sword',
  'shield',
  'potion',
  'bomb',
  'chest',
  'key',
  'gem',
  'joystick',
  'portal',
  'trophy',
  ...stickerIcons,
];

// 个别文章手动指定图标,覆盖哈希随机分配的结果
const iconOverrides: Record<string, PixelIconName> = {
  'typescript/typescript-webpack': 'shield',
  'tool/自用代码提交格式': 'invader',
  'tool/Hexo引入mermaid': 'robot',
  'tool/Hexo外链播放器': 'cat',
  'typescript/typescript入门': 'wizard',
};

/** slug → 图标名:手动指定优先,否则按 slug 哈希稳定分配(同一篇永远同一个图标) */
export function getPostIcon(slug: string): PixelIconName {
  const override = iconOverrides[slug];
  if (override) return override;

  let hash = 0;
  for (let index = 0; index < slug.length; index += 1) {
    hash = (hash * 31 + slug.charCodeAt(index)) >>> 0;
  }
  return postIcons[hash % postIcons.length];
}

/**
 * 图标名 → 贴纸文件名,没有对应文件时返回 null。
 * 手绘精灵(star / hero / wizard …)是组件里的字符画,没有 SVG 文件。
 */
export function stickerFileOf(name: string): string | null {
  if (name.startsWith('sticker-')) return name;
  return expressionStickers[name as keyof typeof expressionStickers] ?? null;
}
