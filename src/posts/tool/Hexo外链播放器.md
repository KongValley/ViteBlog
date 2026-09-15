---
title: 🎵 Hexo 外链播放器
date: 2020-01-06 22:49:39
tags:
  - Hexo
  - Music Player
categories:
  - Build Blog
---
## Web Bookmark
- [MetingJS仓库](https://github.com/metowolf/MetingJS)


## Add MetingJS
在页面上引入下列 css 和 js 文件
```html
<!-- require APlayer -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/aplayer/dist/APlayer.min.css">
<script src="https://cdn.jsdelivr.net/npm/aplayer/dist/APlayer.min.js"></script>
<!-- require MetingJS -->
<script src="https://cdn.jsdelivr.net/npm/meting@2/dist/Meting.min.js"></script>
  
```
如何在 markdown 中使用
```html
# 网易云音乐 歌单
<meting-js
	server="netease"
	type="playlist"
	id="60198">
</meting-js>

# QQ音乐
<meting-js
	auto="https://y.qq.com/n/yqq/song/001RGrEX3ija5X.html">
</meting-js>
```
页面上的显示效果
![以QQ音乐为例](https://blog-chara-img.oss-cn-shanghai.aliyuncs.com/blog-img/Hexo%E5%A4%96%E9%93%BE%E6%92%AD%E6%94%BE%E5%99%A8/1.png)