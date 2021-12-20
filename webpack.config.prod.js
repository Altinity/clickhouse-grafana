const baseWebpackConfig = require('./webpack.config');
const NgAnnotatePlugin = require('ng-annotate-webpack-plugin');
const TerserPlugin = require("terser-webpack-plugin");

baseWebpackConfig.mode = 'production';
baseWebpackConfig.optimization = {
  minimize: true,
  minimizer: [
    new TerserPlugin({
      extractComments: false,
    }),
  ],
}

baseWebpackConfig.plugins.push(new NgAnnotatePlugin());
module.exports = baseWebpackConfig;
