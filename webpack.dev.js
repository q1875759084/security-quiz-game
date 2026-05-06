const { merge } = require('webpack-merge');
const common = require('./webpack.common');

module.exports = merge(common, {
  mode: 'development',

  // eval-cheap-module-source-map：
  //   - 构建速度快（eval 模式），适合 HMR 频繁重编译
  //   - 精确到行（cheap），不精确到列（开发阶段够用）
  //   - module 模式保留原始源码映射（Babel 转译后仍能定位到 TS/JSX 源码）
  devtool: 'eval-cheap-module-source-map',

  devServer: {
    port: 3001,
    historyApiFallback: true, // SPA 刷新 404 兜底
    hot: true,
    open: true,
    proxy: {
      // 本地代理：替代生产环境 Nginx 的反向代理职责
      // 生产：Nginx 将 /api/* 转发到后端服务
      // 本地：devServer 将 /api/* 转发到 target 指定的后端地址
      //
      // ⚠️  target 需根据开发阶段手动调整，无法自动化：
      //   - 纯本地开发（前后端都在本机）：http://localhost:3000
      //   - 联调开发服务器（后端部署在远程）：http://dev.example.com
      //   - 使用 Mock 平台：http://mock.example.com
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        // 支持 HttpOnly Cookie 跨域
        onProxyReq: (proxyReq) => {
          proxyReq.setHeader('Origin', 'http://localhost:3000');
        },
      },
    },
  },
});
