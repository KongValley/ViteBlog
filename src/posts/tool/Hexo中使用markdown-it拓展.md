---
title: 🍟Hexo中使用markdown-it拓展
date: 2020-01-10 19:27:49
cover: /ViteBlog/images/covers/tool__Hexo中使用markdown-it拓展.jpg
tags:
  - hexo
  - markdown-it
categories:
  - Build Blog
---

## Web Bookmark

[Hexo + yilia 替换渲染引擎，支持 emoji 表情](http://yansheng836.coding.me/article/b902694c.html)

[Hexo Markdown 拓展](https://maqingbo.github.io/2019/03/12/Hexo%20Markdown%20%E6%8B%93%E5%B1%95/)

[Emoji 表情列表](https://emoji.muan.co/#)

[Hexo 中添加 emoji 表情](https://blog.csdn.net/weixin_30745641/article/details/95686757)

[Markdown-it-emoji 源码分析](https://juejin.im/post/5d4924bee51d45620771f078)
<br>

## To do it
首先卸载hexo默认的markdown渲染工具

```bash
npm uninstall hexo-renderer-marked --save
```
安装 markdown-it

```bash
npm install hexo-renderer-markdown-it --save
```
安装 markdown-it-emoji

```bash
npm install markdown-it-emoji --save
```

在站点的`_config.yml`文件里添加以下内容:
```yml
# markdown-it
markdown:
  render:
    html: true
    xhtmlOut: false
    breaks: true
    linkify: true
    typographer: true
    quotes: '“”‘’'
  plugins:
    - markdown-it-abbr
    - markdown-it-footnote
    - markdown-it-ins
    - markdown-it-sub
    - markdown-it-sup
    - markdown-it-emoji
  anchors:
    level: 2
    collisionSuffix: 'k'
    permalink: true
    permalinkClass: 'header-anchor'
    permalinkSymbol: '¶'
    case: 0
    separator: '-'
```
这些配置项说明可以在[markdownn-it wiki](https://github.com/hexojs/hexo-renderer-markdown-it/wiki/Advanced-Configuration)上查看

<br>

## Then
由于渲染还是不够完美，有些 emoji 会被解析为 Unicode 字符，所以再安装 twemoji
```bash
npm install twemoji --save
```
安装完之后，需要对 markdown-it-emoji 源码进行编辑，使它使用 twemoji 进行渲染
```js
'use strict';


var emojies_defs      = require('./lib/data/full.json');
var emojies_shortcuts = require('./lib/data/shortcuts');
var emoji_html        = require('./lib/render');
var emoji_replace     = require('./lib/replace');
var normalize_opts    = require('./lib/normalize_opts');
var twemoji = require('twemoji') // 引入twemoji


module.exports = function emoji_plugin(md, options) {
  var defaults = {
    defs: emojies_defs,
    shortcuts: emojies_shortcuts,
    enabled: []
  };

  var opts = normalize_opts(md.utils.assign({}, defaults, options || {}));

  md.renderer.rules.emoji = emoji_html;
  
  md.renderer.rules.emoji = function(token, idx) {
    return twemoji.parse(token[idx].content);
  }; // 使用 twemoji 进行渲染


  md.core.ruler.push('emoji', emoji_replace(md, opts.defs, opts.shortcuts, opts.scanRE, opts.replaceRE));
};

```
由于 twemoji 渲染后，emoji 都为图片，所以我们需要对它们的样式进行下设置
```css
img.emoji {
  height: 1em;
  width: 1em;
  margin: 0 .05em 0 .1em !important;
  box-shadow: none;
  vertical-align: -0.1em;
  padding:0px !important;
  border:none !important;
  display:inline !important;
}
```

<br>

## But
我们也可以使用系统支持的原生 Emoji 去解析那些转成了 Unicode 的字符，我们对 markdown-it-emoji 源码再修改下
```js
'use strict';


var emojies_defs      = require('./lib/data/full.json');
var emojies_shortcuts = require('./lib/data/shortcuts');
var emoji_html        = require('./lib/render');
var emoji_replace     = require('./lib/replace');
var normalize_opts    = require('./lib/normalize_opts');


module.exports = function emoji_plugin(md, options) {
  var defaults = {
    defs: emojies_defs,
    shortcuts: emojies_shortcuts,
    enabled: []
  };

  var opts = normalize_opts(md.utils.assign({}, defaults, options || {}));

  md.renderer.rules.emoji = emoji_html;
  
  md.renderer.rules.emoji = function(token, idx) {
    return '<g-emoji>'+ token[idx].content +'</g-emoji>';
  };// 添加 g-emoji 容器进行包裹

  md.core.ruler.push('emoji', emoji_replace(md, opts.defs, opts.shortcuts, opts.scanRE, opts.replaceRE));
};

```
添加样式
```css
g-emoji {
  font-family: Apple Color Emoji,Segoe UI,Segoe UI Emoji,Segoe UI Symbol;
  font-size: 1.2em;
  font-style: normal!important;
  font-weight: 400;
  line-height: 20px;
  vertical-align: middle;
}
```

<br>

## Test
```
:label:
```
:label:
```
:tada:
```
:tada: