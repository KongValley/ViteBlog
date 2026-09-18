---
title: 🌈TypeScript + Webpack
date: 2020-02-07 19:03:08
tags:
  - TypeScript
categories:
  - TypeScript
---

## Install Typescript

```bash
npm i typescript -S
```

## Install Webpack

安装下本地开发三件套

```bash
npm i webpack webpack-cli webpack-dev-server -D
```

## Install Plugins

```bash
npm i ts-loader clean-webpack-plugin html-webpack-plugin -D
```

## Add config file

新建 `build` 文件夹，在文件夹里新建 `webpack.config.js`

```js
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
module.exports = {
  entry: "./src/index.ts", // 指定入口文件
  output: {
    filename: "main.js" // 指定输出文件
  },
  resolve: {
    extensions: [
      ".ts",
      ".tsx",
      ".js"
    ]
  },
  module: {
    rules: [{
      test: /\.tsx?$/, // 匹配ts文件
      use: 'ts-loader',
      exclude: /node_modules/ // 除外 node_modules 目录
    }]
  },
  devtool: process.env.NODE_ENV === 'production' ? false : 'source-map', // 如果是生产环境不输出 source map，如果是开发环境生成 source map
  devServer: {
    contentBase: './dist', // 告诉服务器从哪个目录中提供内容
    stats: 'errors-only', // 只显示编译过程中错误信息
    compress: false, // 不启用 gzip 压缩
    host: 'localhost', // 地址
    port: '8086' // 端口
  },
  plugins: [
    new CleanWebpackPlugin({
      cleanOnceBeforeBuildPatterns: ['./dist'] // 每次打包前清理 dist 目录
    }),
    new HtmlWebpackPlugin({
      template: './src/template/index.html' // 作为模版 html
    })
  ]
};
```

## Install cross-env

```bash
npm i cross-env -D
```

用来给 `package.json` 里的 `script` 添加参数

```json
{
  "script": {
    "start": "cross-env NODE_ENV=development webpack-dev-server --config ./build/webpack.config.js"
  }
}
```

这样我们就可以用 `process.env.NODE_ENV` 接受到 `development` 这个值。
在开发中我们一般用 `development` 和 `production` 来针对开发环境和生产环境进行不同配置。
接下来在 `webpack.config.js` 内写入以下内容