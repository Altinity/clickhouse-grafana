'use strict';
module.exports = function(config) {
    config.set({
        frameworks: ['systemjs', 'mocha', 'expect', 'sinon'],

        files: [
            'specs/*specs.ts',
            'specs/**/*specs.ts',
            'specs/lib/*.ts',
            { pattern: 'src/**/*.ts', included: false },
            { pattern: 'node_modules/grafana-sdk-mocks/**/*.ts', included: false },
            { pattern: 'node_modules/grafana-sdk-mocks/**/*.js', included: false },
            { pattern: 'node_modules/typescript/lib/typescript.js', included: false },
            { pattern: 'node_modules/systemjs-plugin-css/css.js', included: false },
            { pattern: 'node_modules/lodash/lodash.js', included: false },
            { pattern: 'node_modules/moment/moment.js', included: false },
            { pattern: 'node_modules/q/q.js', included: false }
        ],

        systemjs: {
            //   // SystemJS configuration specifically for tests, added after your config file.
            //   // Good for adding test libraries and mock modules
            config: {
                // Set path for third-party libraries as modules
                paths: {
                    'systemjs': 'node_modules/systemjs/dist/system.js',
                    'system-polyfills': 'node_modules/systemjs/dist/system-polyfills.js',
                    'lodash': 'node_modules/lodash/lodash.js',
                    'moment': 'node_modules/moment/moment.js',
                    'q': 'node_modules/q/q.js',
                    'typescript': 'node_modules/typescript/lib/typescript.js',
                    'plugin-typescript': 'node_modules/plugin-typescript/lib/plugin.js',
                    'css': 'node_modules/systemjs-plugin-css/css.js',
                    'app/': 'node_modules/grafana-sdk-mocks/app/'
                },

                map: {
                    'plugin-typescript': 'node_modules/plugin-typescript/lib/',
                    css: 'node_modules/systemjs-plugin-css/css.js',
                    'typescript': 'node_modules/typescript/',
                    'app/core/utils/kbn': 'node_modules/grafana-sdk-mocks/app/core/utils/kbn.js'
                },

                packages: {
                    'plugin-typescript': {
                        'main': 'plugin.js'
                    },
                    'typescript': {
                        'main': 'lib/typescript.js',
                        'meta': {
                            'lib/typescript.js': {
                                'exports': 'ts'
                            }
                        }
                    },
                    'app': {
                        'defaultExtension': 'ts',
                        'meta': {
                            '*.js': {
                                'loader': 'typescript'
                            }
                        }
                    },
                    'src': {
                        'defaultExtension': 'ts',
                        meta: {
                            '*.css': { loader: 'css' }
                        }
                    },
                    'specs': {
                        'defaultExtension': 'ts',
                        'meta': {
                            '*.js': {
                                'loader': 'typescript'
                            }
                        }
                    }
                },

                transpiler: 'plugin-typescript'
            }
        },

        reporters: ['dots'],

        logLevel: config.LOG_INFO,

        browsers: ['PhantomJS']
    });
};