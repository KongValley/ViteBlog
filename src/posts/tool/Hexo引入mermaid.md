---
title: 🤙Hexo引入Mermaid
date: 2020-01-08 22:22:21
tags:
  - Hexo
  - Mermaid
categories:
  - Build Blog
---

## Web Bookmark
- [Mermaid 与 HighlightJs 的 issue](https://github.com/vsch/idea-multimarkdown/issues/472)

## Fix the bug
```html
<script>
    // using prism
    var mermaids = document.getElementsByClassName('language-mermaid');
    while(mermaids.length > 0) {
        mermaids[0].className = 'mermaid';
    }
    
    // using highlight
    var mermaids = [];
    [].push.apply(mermaids, document.getElementsByClassName('mermaid'));
    for (i = 0; i < mermaids.length; i++) {
        mermaids[i].className = 'nohighlight mermaid';
    }
</script>
<script src="mermaid.min.js"></script>
<script>mermaid.initialize({startOnLoad:true});</script>`
```

这样就能愉快的使用 mermaid 了
![渲染图](https://blog-chara-img.oss-cn-shanghai.aliyuncs.com/blog-img/Hexo%E5%BC%95%E5%85%A5Mermaid/1.png)