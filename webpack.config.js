const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
require('dotenv').config({ path: '.env.development' });

module.exports = {
  mode: 'development',
  entry: './src/index.js',
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
    new webpack.DefinePlugin({
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(process.env.VITE_API_BASE_URL || 'http://localhost:3000'),
    }),
  ],
  devServer: {
    port: 3001,
    historyApiFallback: true, // SPA 刷新 404 兜底
    hot: true,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        // 支持 HttpOnly Cookie 跨域
        onProxyReq: (proxyReq, req, res) => {
          proxyReq.setHeader('Origin', 'http://localhost:3000');
        },
      },
    },
  },
};