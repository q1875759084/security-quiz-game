const { merge } = require('webpack-merge');
const common = require('./webpack.common');

module.exports = merge(common, {
  mode: 'production',

  // production 不输出 source map，避免源码泄露到公网
  // 如需服务端错误定位，可改为 'hidden-source-map'（map 文件不随 bundle 发布，上传到错误监控平台）
  devtool: false,

  // ─── 以下为后续 webpack 优化实操的预留扩展点 ─────────────────────────────────
  //
  // splitChunks：将 node_modules 单独打包为 vendor chunk
  //   浏览器可长期缓存 vendor，业务代码更新时用户无需重新下载依赖
  // optimization: {
  //   splitChunks: {
  //     chunks: 'all',
  //     cacheGroups: {
  //       vendors: {
  //         test: /[\\/]node_modules[\\/]/,
  //         name: 'vendors',
  //         chunks: 'all',
  //       },
  //     },
  //   },
  // },
  //
  // cache（持久化构建缓存，webpack 5 内置）：二次构建速度提升 80%+
  // cache: {
  //   type: 'filesystem',
  // },
  //
  // MiniCssExtractPlugin：将 CSS 从 bundle 中抽离为独立文件，支持并行加载
  // plugins: [new MiniCssExtractPlugin({ filename: '[name].[contenthash].css' })],
});
