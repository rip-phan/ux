/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const CleanWebpackPlugin = require('clean-webpack-plugin')
const CheckerPlugin = require('fork-ts-checker-webpack-plugin')
const ChromeExtensionReloader = require('webpack-chrome-extension-reloader')
const locateContentScripts = require('./utils/locateContentScripts')
/* eslint-enable @typescript-eslint/no-var-requires */

const sourceRootPath = path.join(__dirname, 'src')
const contentScriptsPath = path.join(sourceRootPath, 'ts', 'contentScripts')
const distRootPath = path.join(__dirname, 'dist')
const nodeEnv = process.env.NODE_ENV ? process.env.NODE_ENV : 'development'
const webBrowser = process.env.WEB_BROWSER ? process.env.WEB_BROWSER : 'chrome'

module.exports = {
  entry: {
    background: path.join(sourceRootPath, 'ts', 'background', 'index.ts'),
    options: path.join(sourceRootPath, 'ts', 'options', 'index.tsx'),
    popup: path.join(sourceRootPath, 'ts', 'popup', 'index.tsx'),
    worker: path.join(sourceRootPath, 'ts', 'worker', 'index.ts'),
    ...locateContentScripts(contentScriptsPath)
  },
  output: {
    path: distRootPath,
    filename: '[name].js',
    globalObject: "typeof self !== 'undefined' ? self : this"
  },
  resolve: {
    extensions: ['.js', '.ts', '.tsx', '.json'],
    alias: {
      'react-dom': '@hot-loader/react-dom'
    }
  },
  module: {
    rules: [{ test: /\.(ts|tsx)?$/, loader: 'ts-loader', options: { transpileOnly: true } }]
  },
  devServer: {
    contentBase: './dist',
    hot: true
  },
  plugins: [
    new CheckerPlugin(),
    new HtmlWebpackPlugin({
      template: path.join(sourceRootPath, 'html', 'options.html'),
      inject: 'body',
      filename: 'options.html',
      title: 'Blockstack',
      chunks: ['options']
    }),
    new HtmlWebpackPlugin({
      template: path.join(sourceRootPath, 'html', 'popup.html'),
      inject: 'body',
      filename: 'popup.html',
      title: 'Blockstack',
      chunks: ['popup']
    }),
    new CopyWebpackPlugin([
      {
        from: path.join(sourceRootPath, 'assets'),
        to: path.join(distRootPath, 'assets'),
        test: /\.(jpg|jpeg|png|gif|svg)?$/
      },
      {
        from: path.join(sourceRootPath, 'manifest.json'),
        to: path.join(distRootPath, 'manifest.json'),
        toType: 'file'
      }
    ]),
    new webpack.DefinePlugin({
      NODE_ENV: JSON.stringify(nodeEnv),
      WEB_BROWSER: JSON.stringify(webBrowser)
    })
  ]
}

if (process.env.EXT_ENV === 'watch') {
  module.exports.watch = true
  module.exports.plugins.push(
    new ChromeExtensionReloader({
      port: 9128,
      reloadPage: true,
      entries: {
        background: 'background',
        options: 'options',
        popup: 'popup',
        contentScript: ['counter']
      }
    })
  )
}

if (nodeEnv === 'production') {
  module.exports.plugins.push(new CleanWebpackPlugin(distRootPath, { verbose: true, dry: false }))
}