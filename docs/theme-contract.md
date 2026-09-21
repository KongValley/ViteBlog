# 主题契约

这份文档写清「共享组件」与「主题」的边界。它存在的理由很实际:仓库里有 10 套主题共 1.6 万行 CSS,
而共享组件(分享条、分享图面板、代码块工具条、搜索、归档…)必须在这 10 套里都能看。
过去这条边界只靠约定,结果踩过两次同一类坑(见文末「已知的坑」),两次都是样式优先级问题。

`npm run check:themes` 会把下面第 1、3 条变成可执行的检查,CI 每次跑。

## 1. 变量契约(必须)

共享组件的配色一律写成 `var(--x, 兜底值)` 的形式,**主题必须定义**这些通用名字
(在各自 `style.css` 末尾的「通用变量别名」段里,把本主题自己的变量接过去):

| 变量 | 用途 |
| --- | --- |
| `--bg` | 页面底色 |
| `--surface` | 卡片 / 面板底色 |
| `--ink` / `--ink-strong` | 正文色 / 强调文字色 |
| `--muted` | 次要文字、日期、说明 |
| `--line` | 描边、分隔线 |
| `--red` | 主强调色(链接悬停、按钮、高亮) |
| `--font-body` / `--font-code` | 正文字体 / 等宽字体 |
| `--page-zoom` | 宽屏缩放(`.page` 的 zoom 值) |

其余变量(`--shadow`、`--gold`、`--green`、`--blue`、以及各主题自己的 `--xx-*`)
属于「有就用、没有就退回兜底」的装饰项,不强制。

别名要写成**对本主题变量的引用**(例如 `--surface: var(--be-cell)`),
这样深浅色切换时跟着主题自己的 `[data-theme="dark"]` 段一起翻转,不用维护第二份色板。

## 2. 优先级规则(重要)

共享组件的样式有两档写法,选哪档决定主题能不能覆盖它:

- **`:where(.foo)`** —— 0 优先级,**主题永远能盖过它**。用于「主题应该有权重定义」的版面与配色。
- **`.foo`(普通类选择器)** —— 用于「组件必须自己说了算」的属性,典型是**可交互元素的文字表现**:
  颜色、字号、字重、`text-decoration`、`appearance`。因为主题里往往有一条全局
  `a { color: var(--blue) }`(元素选择器,优先级 0,0,1),它比 `:where()` 高,但比类选择器低。

**规则**:凡是 `<a>` / `<button>` 上「不这样写就会出错」的属性,用普通类选择器写,并在 `:hover` /
`:active` 上再声明一遍 —— 主题的 `a:hover { text-decoration: underline }` 是 (0,1,1),
单个类 (0,1,0) 压不住它。圆角之类「主题有话说」的属性留在 `:where()` 里。

变量名不要复用主题私有前缀(`--nr-`、`--be-` 之类),共享组件只认第 1 节那张表。

## 3. 动效与无障碍

每套主题都要有:

```css
@media (prefers-reduced-motion: reduce) {
  /* 关掉或大幅缩短无限动画(闪烁、扫描线、跑马灯) */
}
```

`npm run check:themes` 会检查这一段是否存在 —— 曾经只有 pixel 主题漏了。

## 4. 新增一套主题要改哪些地方

1. `src/themes/<name>/style.css` —— 主题样式,末尾带「通用变量别名」段;
2. `src/themes/<name>/index.ts` —— 主题入口(`style.css` + 字体等,供 `virtual:site-theme` 加载);
3. `src/views/home/<Name>Home.tsx` —— 首页组件,**props 必须是 `HomeData`**(见 `src/views/home/shared.ts`);
   文件名要与主题名对应(`site.yml` 的 `theme: <name>` → `virtual:site-home` 注入 `<Name>Home`);
4. `src/data/site.ts` 的 `THEME_NAMES` + `vite.config.ts` 的 `THEMES` 白名单;
5. `design-preview/check-isolation.mjs` 的 `FINGERPRINTS`(主题指纹,用于隔离自检)与 `THEME_LIST`;
6. `design-preview/build-all.mjs` / `serve-dist.mjs` / `shoot.mjs` 里的主题清单;
7. `site.yml` 的主题注释列表与 README 的主题表。

漏了第 3 步:`Home.tsx` 会走 `virtual:site-home` 报错(构建期就会失败,不会静默);
漏了第 5、6 步:隔离自检与预览脚本会少检查一套,不会报错 —— 所以新增主题后请顺手过一遍这个清单。

## 5. 已知的坑(都是这套边界没写清导致的)

1. **分享条按钮文字变蓝**(`src/components/ShareBar.css`):`微博` / `X` 是 `<a>`,
   被主题的 `a { color: var(--blue) }` 盖掉了 `:where(.share-btn)`,两个字显示成蓝色。
2. **分享图面板「下载图片」变蓝、悬停还冒出下划线**(`src/components/SharePoster.css`):
   同上,且 `a:hover` 的优先级更高,需要在 `:hover` / `:active` 再声明一遍 `text-decoration: none`。
3. **代码块工具条被裁**:`.aplayer` 那套 6 级选择器与主题裁剪规则打架,音量条弹层被裁没
   (`src/components/MusicDock.css`)—— 结论是「组件要自己接管交互几何」,不要指望主题的 `overflow` 配置。
4. **bento / brutalist 漏了 `--font-body`**:共享组件退回 `inherit`,字体和主题其它地方不一致 ——
   现在由 `npm run check:themes` 兜住。

## 6. 为什么不用 `@layer`

`@layer` 听起来更适合做这件事,但:**未分层的样式永远赢过分层的样式**。
一旦把共享组件放进 layer,而 10 套主题样式仍是未分层的,组件会被任何一条主题元素选择器压住 ——
比现在的处境更糟;要彻底改就得把 1.6 万行主题 CSS 全部搬进 layer,收益不抵风险。
