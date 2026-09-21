// 分享图排版函数的回归测试:这两个函数回归过两次 ——
// ① 没有空格的超长 URL 被整段画到卡片外;② 一行就装得下的短文本被错误地加上省略号。
// 假 ctx 只提供 measureText,每个字符按 10px 计,和真实 canvas 的「宽 = 字符数 × 10」一致。
// 注:Node 的 ESM 解析不做扩展名补全,单测里必须写全 ./ 后的 .ts 后缀。
import assert from 'node:assert/strict';
import test from 'node:test';
import { splitByWidth, wrapText } from './canvasText.ts';

const CHAR_WIDTH = 10;

/** 只有 measureText 的假绘图上下文:每个字符固定 10px */
const ctx = {
  measureText: (text: string) => ({ width: text.length * CHAR_WIDTH }),
} as unknown as CanvasRenderingContext2D;

test('一行就装得下的短文本不带省略号', () => {
  const lines = wrapText(ctx, '短文本', 100, 3);
  assert.deepEqual(lines, ['短文本'], '三个字占 30px,远小于 100px,应只有一行');
  assert.ok(
    !lines.some((line) => line.includes('…')),
    '内容没被丢掉时不该出现省略号',
  );
});

test('超出 maxLines 时最后一行带省略号', () => {
  const lines = wrapText(ctx, '一二三四五六七八九十一二三四五六', 50, 2);
  assert.equal(lines.length, 2, 'maxLines 为 2 时最多返回两行');
  assert.ok(
    lines[1].endsWith('…'),
    `内容被截掉时必须省略号收尾,实际最后一行是「${lines[1]}」`,
  );
});

test('没有空格的超长 token 被切成多行,每行都不超过 maxWidth', () => {
  const url = 'https://example.com/very/long/path/without/any/space-abcdefg';
  const maxWidth = 100;
  const lines = wrapText(ctx, url, maxWidth, 10);
  assert.deepEqual(
    lines,
    [
      'https://ex',
      'ample.com/',
      'very/long/',
      'path/witho',
      'ut/any/spa',
      'ce-abcdefg',
    ],
    '无空格 token 按字符切成每 10 个一段,顺序不能乱',
  );
  assert.ok(
    lines.every((line) => line.length * CHAR_WIDTH <= maxWidth),
    `每一行都必须放得下,maxWidth=${maxWidth},实际每行字符数=${lines
      .map((line) => line.length)
      .join(',')}`,
  );
});

test('中文逐字断行可用', () => {
  const lines = wrapText(ctx, '中文逐字断行', 30, 5);
  assert.deepEqual(
    lines,
    ['中文逐', '字断行'],
    '30px 一行三个汉字,其余另起一行',
  );
  assert.ok(
    !lines.some((line) => line.includes('…')),
    '两行就放完了,不该有省略号',
  );
});

test('splitByWidth 按字符切块且不丢字符', () => {
  const chunks = splitByWidth(ctx, 'abcdefghijklm', 50);
  assert.deepEqual(chunks, ['abcde', 'fghij', 'klm'], '每块 5 个字符');
  assert.equal(chunks.join(''), 'abcdefghijklm', '切块不能丢字符或改顺序');
});
