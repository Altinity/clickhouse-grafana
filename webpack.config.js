const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const { ProvidePlugin } = require("webpack");

module.exports = {
  context: path.join(__dirname, 'src'),
  entry: {
    'module': './module.ts',
  },
  devtool: 'source-map',
  output: {
    filename: '[name].js',
    path: path.join(__dirname, 'dist'),
    libraryTarget: 'amd',
  },
  externals: [
    'lodash',
    function (context, request, callback) {
      let prefix = 'grafana/';
      if (request.indexOf(prefix) === 0) {
        return callback(null, request.substr(prefix.length));
      }
      callback();
    }
  ],
  plugins: [
    new ProvidePlugin({
      process: 'process/browser',
    }),
    new CleanWebpackPlugin({
      cleanOnceBeforeBuildPatterns: ['!altinity-clickhouse-plugin**', 'MANIFEST.txt'],
    }),
    new CopyWebpackPlugin({
      patterns: [
        {from: 'plugin.json', to: '.'},
        {from: '../README.md', to: '.'},
        {from: '../LICENSE', to: '.'},
        {from: 'img/*', to: '.'},
        {from: 'partials/*', to: '.'},
      ]
    }),
  ],
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    alias: {
      process: 'process/browser',
    },
    fallback: {
      fs: false,
      stream: require.resolve('stream-browserify')
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ng-annotate-loader',
            options: {
              ngAnnotate: 'ng-annotate-patched'
            }
          },
          { loader: 'babel-loader' },
          { loader: 'ts-loader' },
        ],
        exclude: /(node_modules)/,
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: 'style-loader'
          },
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
              sourceMap: true
            }
          },
        ]
      }
    ]
  }
};
