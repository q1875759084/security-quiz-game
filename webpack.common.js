const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { DefinePlugin } = require('webpack');

// CI 构建时（测试/联调/生产/泳道）都会注入 DEPLOY_ENV，本地启动时没有任何人注入它
// 因此用 DEPLOY_ENV 是否存在来区分"CI 构建"和"本地开发"，比 NODE_ENV 更准确：
//   NODE_ENV 只反映 webpack 的构建模式（development/production），无法区分业务环境
//   DEPLOY_ENV 是业务层面的环境标识，只有 CI 平台才会注入
const isCI = !!process.env.DEPLOY_ENV;
if (!isCI) {
  // 仅本地开发时读取 .env.development，CI 环境变量由平台直接注入，不依赖文件。
  // 当前 .env.development 只有 DEPLOY_ENV=dev，与下方 || 'dev' fallback 效果相同，
  // 但保留此文件作为扩展点：后续本地差异化配置（如 MOCK_API、FEATURE_FLAG 等）在此追加即可。
  require('dotenv').config({ path: path.resolve(__dirname, '.env.development') });
}

module.exports = {
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.[contenthash].js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.(jsx?|tsx?)$/,
        exclude: /node_modules/,
        use: 'babel-loader',
      },
      {
        test: /\.(s[ac]ss|css)$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: {
                auto: true,
                localIdentName: '[name]__[local]__[hash:base64:5]',
              },
            },
          },
          {
            loader: 'sass-loader',
            options: {
              sassOptions: {
                silenceDeprecations: ['legacy-js-api'],
              },
            },
          },
        ],
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
    new DefinePlugin({
      // baseURL 固化为 /api，无需注入：
      //   本地：devServer proxy 拦截 /api/* 转发到本地后端
      //   服务器：Nginx 拦截 /api/* 转发到后端服务
      //   两个环境行为一致，前端代码无差异
      // DEPLOY_ENV 才是真正需要注入的业务环境标识（dev/test/staging/production）
      __DEPLOY_ENV__: JSON.stringify(process.env.DEPLOY_ENV || 'dev'),
    }),
  ],
};
