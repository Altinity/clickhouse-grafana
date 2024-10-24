import type { Configuration } from 'webpack';
import { mergeWithRules } from 'webpack-merge';
import grafanaConfig from './.config/webpack/webpack.config';

const config = async (env: any): Promise<Configuration> => {
  const baseConfig = await grafanaConfig(env);
  const customConfig = {
    module: {
      rules: [
        {
          exclude: /(node_modules|v2)/,
        },
      ],
    },
  }
  return mergeWithRules({
    module: {
      rules: {
        exclude: 'replace',
      },
    },
  })(baseConfig, customConfig);
};

export default config;