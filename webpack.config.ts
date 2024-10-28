import type { Configuration } from 'webpack';
import { mergeWithRules } from 'webpack-merge';
import grafanaConfig from './.config/webpack/webpack.config';
import path from 'path';

const config = async (env: any): Promise<Configuration> => {
  const baseConfig = await grafanaConfig(env);
  const customConfig = {
    module: {
      rules: [
        {
          exclude: /(node_modules|v2)/,
          use: {
            options: {
              jsc: {
                baseUrl: './instrumented',
              },
            },
          },
        },
      ],
    },
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      // handle resolving "rootDir" paths
      modules: [path.resolve(process.cwd(), 'instrumented'), 'node_modules'],
      unsafeCache: true,
    },
  },
  return mergeWithRules({
    module: {
      rules: {
        exclude: 'replace',
      },
    },
  })(baseConfig, customConfig);
};

export default config;