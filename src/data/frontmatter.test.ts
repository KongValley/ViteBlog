// frontmatter 解析是所有页面元信息的源头(构建期扫目录、运行期去正文头部都用它),
// 解析歪了标题/标签/分类会整站跟错,所以把各种写法钉在这里。
// 注:Node 的 ESM 解析不做扩展名补全,单测里必须写全 ./ 后的 .ts 后缀。
import assert from 'node:assert/strict';
import test from 'node:test';
import { countWords, parseFrontmatter } from './frontmatter.ts';

const SAMPLE = [
  '---',
  'title: 一篇测试文章',
  'date: 2026-09-18 09:30:00',
  'tags:',
  '  - 前端',
  '  - TypeScript',
  'categories:',
  '  - 教程',
  'excerpt: "引号里的摘要: 还能带冒号"',
  'cover: https://example.com/cover.png',
  '---',
  '',
  '正文第一行。',
  '',
].join('\n');

test('解析出 title / date / 数组型 tags 与 categories / excerpt / cover', () => {
  const { meta, content } = parseFrontmatter(SAMPLE);
  assert.equal(meta.title, '一篇测试文章', 'title 应原样取出');
  assert.equal(meta.date, '2026-09-18 09:30:00', 'date 含时间时整串保留');
  assert.deepEqual(meta.tags, ['前端', 'TypeScript'], 'tags 按缩进列表收集');
  assert.deepEqual(meta.categories, ['教程'], 'categories 按缩进列表收集');
  assert.equal(
    meta.excerpt,
    '"引号里的摘要: 还能带冒号"',
    'excerpt 取冒号后的全部内容:值里的冒号不影响解析(引号暂时原样保留)',
  );
  assert.equal(meta.cover, 'https://example.com/cover.png', 'cover 原样取出');
  assert.equal(
    content,
    '\n正文第一行。\n',
    'content 必须是去掉 frontmatter 之后的正文(只吃掉结束的 --- 那一行)',
  );
});

test('tags 写成行内逗号分隔时也能拆成数组', () => {
  const { meta } = parseFrontmatter(
    ['---', 'title: 行内标签', 'tags: 前端, TypeScript，构建', '---', ''].join(
      '\n',
    ),
  );
  assert.deepEqual(
    meta.tags,
    ['前端', 'TypeScript', '构建'],
    '半角与全角逗号都要当分隔符',
  );
});

test('没有 frontmatter 时整篇当正文,元信息为空', () => {
  const { meta, content } = parseFrontmatter('# 只有正文\n\n没有元信息。\n');
  assert.deepEqual(meta, {}, '没写 frontmatter 就不该凭空造出字段');
  assert.equal(content, '# 只有正文\n\n没有元信息。\n', '正文应原样返回');
});

test('覆盖 frontmatter 时保留字段,未知字段被忽略', () => {
  const { meta } = parseFrontmatter(
    ['---', 'title: 只有标题', 'draft: true', '---', ''].join('\n'),
  );
  assert.equal(meta.title, '只有标题', '已知字段照常解析');
  assert.equal(
    Object.hasOwn(meta, 'draft'),
    false,
    '未支持的字段不该出现在 meta 上',
  );
});

test('countWords 按中英混排统计字数', () => {
  assert.equal(
    countWords('你好 world 世界'),
    5,
    'CJK 四字各算一个词,英文 world 算一个词',
  );
  assert.equal(
    countWords('你好，世界!'),
    4,
    '中文标点不属于 CJK 范围,也不该被当成英文单词',
  );
  assert.equal(
    countWords('Vite 构建 vite-blog 很快'),
    6,
    '两个英文词 + 构建(2 字) + 很快(2 字) = 6',
  );
  assert.equal(countWords('   \n\t '), 0, '空白文本算 0 字');
});
