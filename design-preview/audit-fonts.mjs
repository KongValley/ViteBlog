// 交互控件字号体检 / 修正工具
//
// 背景:十套主题各有自己的设计语言,但「要动手点」的元素(导航、标签、分页、
// 按钮、目录)字号普遍被压到 10~12px,在 1440 宽下明显偏小。
// 本脚本把「可点击控件字号下限」固化成一份策略表,既能体检也能一键修正。
//
// 用法:
//   node design-preview/audit-fonts.mjs              # 体检全部主题
//   node design-preview/audit-fonts.mjs swiss noir   # 只体检指定主题
//   node design-preview/audit-fonts.mjs --fix        # 按策略表修正(只改偏小的)
//   node design-preview/audit-fonts.mjs --fix swiss  # 只修指定主题

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const THEMES_DIR = join(ROOT, 'src', 'themes');

// 策略表:从上往下匹配,先命中的生效。
// min = 该控件字号的建议下限(px);null = 只报告、不修正。
const POLICY = [
  // 卡片/文章头部的标签徽标:装饰性,不点,但别小到看不清
  { test: /\.tag-small$/, min: 12.5, why: '标签徽标(装饰)' },
  { test: /\.(tag-count|page-count)$/, min: 12.5, why: '计数徽标(装饰)' },
  { test: /\.tags-summary$/, min: 14, why: '标签页说明文字' },
  { test: /^\.tag-cloud$/, min: null, why: '标签云容器(字号由子项决定)' },
  // 标签筛选条 / 标签云里的可点标签
  { test: /\.(tag|chip|tag-cloud-item)$/, min: 13.5, why: '标签筛选(可点)' },
  { test: /\.toc-link$/, min: 14, why: '文章目录(可点)' },
  { test: /\.nav-link$/, min: 14, why: '顶部导航(可点)' },
  { test: /\.theme-toggle$/, min: 14, why: '昼夜切换(可点)' },
  { test: /\.page-btn$/, min: 14, why: '分页(可点)' },
  {
    test: /(-btn$|\.link$|\.cloud-btn$)/,
    min: 14,
    why: '行动按钮 / 链接(可点)',
  },
  // 兜底:凡是带交互关键词但没写进策略表的,只报告
  { test: /./, min: null, why: '未纳入策略表' },
];

const INTERACTIVE = [
  'button',
  '.btn',
  '-btn',
  '.tag',
  '.chip',
  '.nav-link',
  '.page-btn',
  '.theme-toggle',
  '.toc-link',
  '.filter',
  '.link',
  'input',
  'select',
  'textarea',
];

// 解析 CSS,保留每段声明的字节区间,便于原地改写
function parseRules(css) {
  const rules = [];
  const stack = [];
  let token = '';
  let tokenStart = 0;

  for (let i = 0; i < css.length; i++) {
    const ch = css[i];

    if (ch === '{') {
      const selector = token.trim();
      const selectorStart = tokenStart;
      token = '';
      tokenStart = i + 1;

      if (selector.startsWith('@')) {
        stack.push(selector);
        continue;
      }

      let depth = 1;
      let j = i + 1;
      for (; j < css.length; j++) {
        if (css[j] === '{') depth++;
        else if (css[j] === '}') {
          depth--;
          if (depth === 0) break;
        }
      }
      rules.push({
        selector,
        selectorStart,
        bodyStart: i + 1,
        bodyEnd: j,
        context: stack.join(' | '),
      });
      i = j;
      continue;
    }

    if (ch === '}') {
      stack.pop();
      token = '';
      tokenStart = i + 1;
      continue;
    }

    if (token === '' && /\s/.test(ch)) {
      tokenStart = i + 1;
      continue;
    }

    token += ch;
  }

  return rules;
}

function isInteractive(selector) {
  const lower = selector.toLowerCase();
  return INTERACTIVE.some((key) => lower.includes(key));
}

function policyFor(selector) {
  const last = selector.split(',').pop().trim(); // 多选择器取最后一个判断
  return POLICY.find((entry) => entry.test.test(last)) ?? null;
}

function readFontSize(body) {
  const match = body.match(/(^|;)([^;{}]*?)font-size\s*:\s*([^;]+)/);
  if (!match) return null;
  const raw = match[3].trim();
  // 值一定在匹配片段的末尾([^;]+ 是贪婪的),用 lastIndexOf 定位最稳
  const offset = match[0].lastIndexOf(raw);
  if (offset < 0) return null;
  return { index: match.index + offset, raw };
}

function toPx(value) {
  if (!value) return null;
  const px = value.match(/^([\d.]+)px$/);
  if (px) return Number(px[1]);
  const rem = value.match(/^([\d.]+)rem$/);
  if (rem) return Number(rem[1]) * 16;
  const clamp = value.match(/clamp\(\s*([\d.]+)px/);
  if (clamp) return Number(clamp[1]);
  return null;
}

const args = process.argv.slice(2);
const fix = args.includes('--fix');
const requested = args.filter((arg) => !arg.startsWith('--'));

const themes = requested.length
  ? requested
  : readdirSync(THEMES_DIR).filter((name) =>
      statSync(join(THEMES_DIR, name)).isDirectory(),
    );

let flagged = 0;
let changed = 0;

for (const theme of themes) {
  const file = join(THEMES_DIR, theme, 'style.css');
  let css;
  try {
    css = readFileSync(file, 'utf8');
  } catch {
    console.log(`\n=== ${theme} ===  (没有 style.css,跳过)`);
    continue;
  }

  const rules = parseRules(css).filter((r) => isInteractive(r.selector));
  const rows = [];

  for (const rule of rules) {
    const body = css.slice(rule.bodyStart, rule.bodyEnd);
    const size = readFontSize(body);
    if (!size) continue;
    const px = toPx(size.raw);
    if (px === null) continue;
    const policy = policyFor(rule.selector);
    if (!policy) continue;
    rows.push({ rule, size, px, policy });
  }

  const issues = rows.filter((r) => r.policy.min !== null && r.px < r.policy.min);
  flagged += issues.length;

  console.log(`\n=== ${theme} ===`);
  if (!rows.length) {
    console.log('  (没有可判定的交互控件字号)');
    continue;
  }
  for (const { rule, size, px, policy } of rows.sort((a, b) => a.px - b.px)) {
    const isIssue = policy.min !== null && px < policy.min;
    const mark = isIssue ? '  ⚠ ' : '    ';
    const media = rule.context ? `  [${rule.context}]` : '';
    const target = policy.min === null ? '' : `  → 建议 ${policy.min}px`;
    console.log(
      `${mark}${String(px).padStart(5)}px  ${rule.selector}${media}  (${policy.why})${target}`,
    );
    void size;
  }
  console.log(`  → 低于下限:${issues.length} 处`);

  if (!fix || !issues.length) continue;

  // 先把所有替换点按原始坐标收集齐,再倒序应用:替换区间互不重叠,偏移才不会错乱
  const edits = [];
  for (const { rule, policy } of issues) {
    const body = css.slice(rule.bodyStart, rule.bodyEnd);
    const fresh = readFontSize(body);
    if (!fresh) continue;
    const valueStart = rule.bodyStart + fresh.index;
    edits.push({
      start: valueStart,
      end: valueStart + fresh.raw.length,
      value: `${policy.min}px`,
      check: css.slice(valueStart, valueStart + fresh.raw.length),
    });
  }

  const bad = edits.filter((edit) => edit.check !== css.slice(edit.start, edit.end));
  if (bad.length) {
    console.log(`  ✗ 有 ${bad.length} 处定位校验失败,已跳过修正`);
    continue;
  }

  const next = edits
    .sort((a, b) => b.start - a.start)
    .reduce(
      (acc, edit) => acc.slice(0, edit.start) + edit.value + acc.slice(edit.end),
      css,
    );

  writeFileSync(file, next, 'utf8');
  changed += edits.length;
  console.log(`  ✓ 已修正 ${edits.length} 处`);
}

console.log(
  `\n${fix ? '已修正' : '低于下限'} ${fix ? changed : flagged} 处交互控件字号${fix ? '' : '(加 --fix 可自动修正)'}`,
);