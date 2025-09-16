const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: {
      content: './src/content/content.js',
      background: './src/background/background.js',
      popup: './src/popup/popup.js',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true,
    },
    module: {
      rules: [
        {
          test: /\.css$/i,
          use: [MiniCssExtractPlugin.loader, 'css-loader'],
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'assets/[name][ext]',
          },
        },
      ],
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: 'assets/[name].css',
      }),
      new CopyPlugin({
        patterns: [
          {
            from: isProduction ? 'manifest.json' : 'manifest.dev.json',
            to: 'manifest.json',
          },
          {
            from: 'src/assets/*.png',
            to: 'assets/[name][ext]',
            noErrorOnMissing: true,
          },
          {
            from: 'src/popup/popup.html',
            to: 'popup.html',
          },
          // Hot reload script removed from production builds
        ],
      }),
    ],
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: false, // Keep console logs for extension debugging
              drop_debugger: true,
              pure_funcs: [], // Don't remove any functions
            },
            mangle: {
              reserved: ['chrome', 'browser', 'window', 'document', 'exports', 'module'],
            },
            format: {
              comments: false,
            },
          },
        }),
      ],
      concatenateModules: false, // Disable module concatenation for extensions
    },
    devtool: isProduction ? false : 'cheap-module-source-map',
    resolve: {
      extensions: ['.js', '.json'],
    },
    stats: {
      colors: true,
      modules: false,
      children: false,
      chunks: false,
      chunkModules: false,
    },
  };
};
