// 摘录抽取的回归测试:上周「一级标题紧跟正文、中间没有空行」时摘不出正文,
// 就是这里按空行切块造成的;这类写法在文章里很常见,必须有测试盯着。
// 注:Node 的 ESM 解析不做扩展名补全,单测里必须写全 ../ 后的 .ts 后缀。
import assert from 'node:assert/strict';
import test from 'node:test';
import { excerptFromMarkdown } from './excerpt.ts';

test('标题紧跟正文(中间没有空行)时能摘到正文', () => {
  const excerpt = excerptFromMarkdown(
    '## 小标题\n正文紧跟在标题后面,中间没有空行,摘录必须能拿到这一段。',
  );
  assert.equal(
    excerpt,
    '正文紧跟在标题后面,中间没有空行,摘录必须能拿到这一段。',
    '标题行应被跳过,紧跟其后的正文行应成为摘录',
  );
});

test('代码围栏里的内容不会被当成摘录', () => {
  const excerpt = excerptFromMarkdown(
    [
      '```js',
      'const thisIsCodeNotProse = doSomething();',
      '```',
      '',
      '围栏下面才是正文,长度够当摘录用。',
    ].join('\n'),
  );
  assert.equal(
    excerpt,
    '围栏下面才是正文,长度够当摘录用。',
    '代码块里的整段内容都必须被丢掉',
  );
});

test('列表行被整行跳过,取后面的正文', () => {
  const excerpt = excerptFromMarkdown(
    [
      '- [这一行是列表项,不该当摘录](/post/hello-vite-blog)',
      '',
      '正文段落足够长,应当被选为摘录内容。',
    ].join('\n'),
  );
  assert.equal(
    excerpt,
    '正文段落足够长,应当被选为摘录内容。',
    '列表行整行跳过,不含列表记号的正文才入选',
  );
});

test('只有一行裸链接时不拿链接文字当摘录', () => {
  const excerpt = excerptFromMarkdown(
    [
      '[点我](/post/hello-vite-blog)',
      '',
      '正文段落内容足够长,可以当摘录。',
    ].join('\n'),
  );
  assert.equal(
    excerpt,
    '正文段落内容足够长,可以当摘录。',
    '链接剥掉后只剩「点我」两个字,太短不该入选,应继续找下一段',
  );
});

test('超长摘录被截断并以省略号收尾', () => {
  const excerpt = excerptFromMarkdown('这是一段非常长的正文内容。'.repeat(20));
  assert.equal(
    excerpt.length,
    97,
    '正文超过 96 字时应截到 96 字再加一个省略号',
  );
  assert.ok(excerpt.startsWith('这是一段'), '截断应保留正文开头');
  assert.ok(excerpt.endsWith('…'), '截断后必须以省略号收尾');
});

test('全篇只有标题和代码块时返回空串', () => {
  const excerpt = excerptFromMarkdown(
    ['# 标题', '', '```js', 'const nothingToQuote = true;', '```', ''].join(
      '\n',
    ),
  );
  assert.equal(excerpt, '', '没有可用正文时应返回空串,而不是代码或标题');
});
