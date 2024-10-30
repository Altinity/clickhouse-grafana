import CopyWebpackPlugin from 'copy-webpack-plugin';
import ESLintPlugin from 'eslint-webpack-plugin';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import LiveReloadPlugin from 'webpack-livereload-plugin';
import ReplaceInFileWebpackPlugin from 'replace-in-file-webpack-plugin';
import type { Configuration } from 'webpack';
import { mergeWithRules } from 'webpack-merge';
import grafanaConfig from './.config/webpack/webpack.config';
import path from 'path';
import fs from 'fs';
import { getPackageJson, getPluginJson, hasReadme, isWSL } from './.config/webpack/utils';
import { DIST_DIR } from './.config/webpack/constants';
import { glob } from 'glob';

const SOURCE_DIR = 'instrumented';
const pluginJson = getPluginJson();

async function getEntries(): Promise<Record<string, string>> {
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
    entry: await getEntries(),
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
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          // If src/README.md exists use it; otherwise the root README
          // To `compiler.options.output`
          { from: hasReadme() ? 'README.md' : '../README.md', to: '.', force: true },
          { from: 'plugin.json', to: '.' },
          { from: '../LICENSE', to: '.' },
          { from: '../CHANGELOG.md', to: '.', force: true },
          { from: '**/*.json', to: '.' }, // TODO<Add an error for checking the basic structure of the repo>
          { from: '**/*.svg', to: '.', noErrorOnMissing: true }, // Optional
          { from: '**/*.png', to: '.', noErrorOnMissing: true }, // Optional
          { from: '**/*.html', to: '.', noErrorOnMissing: true }, // Optional
          { from: 'img/**/*', to: '.', noErrorOnMissing: true }, // Optional
          { from: 'libs/**/*', to: '.', noErrorOnMissing: true }, // Optional
          { from: 'static/**/*', to: '.', noErrorOnMissing: true }, // Optional
        ],
      }),
      // Replace certain template-variables in the README and plugin.json
      new ReplaceInFileWebpackPlugin([
        {
          dir: DIST_DIR,
          files: ['plugin.json', 'README.md'],
          rules: [
            {
              search: /\%VERSION\%/g,
              replace: getPackageJson().version,
            },
            {
              search: /\%TODAY\%/g,
              replace: new Date().toISOString().substring(0, 10),
            },
            {
              search: /\%PLUGIN_ID\%/g,
              replace: pluginJson.id,
            },
          ],
        },
      ]),
      new ForkTsCheckerWebpackPlugin({
        async: Boolean(env.development),
        issue: {
          include: [{ file: '**/*.{ts,tsx}' }],
        },
        typescript: { configFile: path.join(process.cwd(), 'tsconfig_tests.json') },
      }),
      new ESLintPlugin({
        extensions: ['.ts', '.tsx'],
        lintDirtyModulesOnly: Boolean(env.development), // don't lint on start, only lint changed files
      }),
      ...(env.development ? [new LiveReloadPlugin()] : []),
    ],
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      // handle resolving "rootDir" paths
      modules: [path.resolve(process.cwd(), 'instrumented'), 'node_modules'],
      unsafeCache: true,
    },
  };
  return mergeWithRules({
    entry: 'replace',
    module: {
      rules: {
        exclude: 'replace',
        use: {
          options: {
            jsc: {
              baseUrl: 'replace',
            },
          },
        },
      },
    },
    plugins: 'replace',
    resolve: 'replace'
  })(baseConfig, customConfig);
};

export default config;
