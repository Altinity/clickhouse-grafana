const path = require('path');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  entry: './src/backend/index.ts', // Adjust this to the entry point of your TypeScript project
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(__dirname, 'tsconfig.backend.json'),
            allowTsInNodeModules: true
          }
        },
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      'http2': 'http', // Alias http2 to http
      'dns': 'native-dns', // Alias dns to native-dns
    },
    fallback: {
      "net": false,
      "tls": false,
      "dgram": false,
      "dns": require.resolve("native-dns"),
      "path": require.resolve("path-browserify"),
      "stream": require.resolve("stream-browserify"),
      "crypto": require.resolve("crypto-browserify"),
    },
  },
  output: {
    filename: 'backend-plugin.js',
    path: path.resolve(__dirname, 'dist'),
  },
  mode: 'development',
  plugins: [
    new NodePolyfillPlugin()
  ],
  optimization: {
    minimize: false, // Disable minification
  },
  devtool: 'source-map', // Optional, if you want source maps,
  target: 'node'
};
