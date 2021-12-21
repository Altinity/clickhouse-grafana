const baseWebpackConfig = require('./webpack.config');
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

module.exports = baseWebpackConfig;
