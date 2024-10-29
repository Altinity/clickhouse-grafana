import type { Configuration } from 'webpack';
import { mergeWithRules } from 'webpack-merge';
import grafanaConfig from './.config/webpack/webpack.config';
import path from 'path';

export const SOURCE_DIR = 'instrumented';

export async function getEntries(): Promise<Record<string, string>> {
  const pluginsJson = await glob('**/instrumented/**/plugin.json', { absolute: true });

  const plugins = await Promise.all(pluginsJson.map((pluginJson) => {
      const folder = path.dirname(pluginJson);
      return glob(`${folder}/module.{ts,tsx,js,jsx}`, { absolute: true });
    })
  );

  return plugins.reduce((result, modules) => {
    return modules.reduce((result, module) => {
      const pluginPath = path.dirname(module);
      const pluginName = path.relative(process.cwd(), pluginPath).replace(/instrumented\/?/i, '');
      const entryName = pluginName === '' ? 'module' : `${pluginName}/module`;

      result[entryName] = module;
      return result;
    }, result);
  }, {});
}

const config = async (env: any): Promise<Configuration> => {
  const baseConfig = await grafanaConfig(env);
  const customConfig = {
    module: {
      rules: [
        {
          exclude: /(node_modules|v2)/,
          use: {
            options: {
              configFile: "tsconfig_tests.json",
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
