const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  mode: 'production',
  entry: {
    xterm: './src/xterm/src/browser/public/Terminal.ts'
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: '[name].js',
    library: 'Terminal',
    libraryTarget: 'umd',
    libraryExport: 'Terminal',
    globalObject: 'this'
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      'browser': path.resolve(__dirname, 'src/xterm/src/browser'),
      'common': path.resolve(__dirname, 'src/xterm/src/common'),
      'vs': path.resolve(__dirname, 'src/xterm/src/vs')
    },
    modules: [
      path.resolve(__dirname, 'src/xterm/src'),
      'node_modules'
    ]
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(__dirname, 'tsconfig.json'),
            transpileOnly: true,
            compilerOptions: {
              declaration: false,
              declarationMap: false
            }
          }
        },
        exclude: [/node_modules/, /\.test\.ts$/, /\.test\.tsx$/]
      }
    ]
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({
      terserOptions: {
        format: {
          comments: false,
        },
      },
      extractComments: false,
    })],
  },
  externals: {
    // Don't bundle node modules
    'fs': 'commonjs fs',
    'path': 'commonjs path'
  },
  plugins: [
    new webpack.IgnorePlugin({
      resourceRegExp: /\.test\.ts$/
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production')
    })
  ],
  stats: {
    errorDetails: false,
    warnings: false
  }
};