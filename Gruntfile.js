module.exports = function(grunt) {
    require('load-grunt-tasks')(grunt);

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-typescript');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.initConfig({
        clean: ["dist"],

        copy: {
            dist_js: {
                expand: true,
                cwd: 'src',
                src: ['**/*.ts', '**/*.js', '**/*.d.ts'],
                dest: 'dist'
            },
            dist_html: {
                expand: true,
                flatten: true,
                cwd: 'src/partials',
                src: ['*.html'],
                dest: 'dist/partials/'
            },
            dist_css: {
                expand: true,
                flatten: true,
                cwd: 'src/css',
                src: ['*.css'],
                dest: 'dist/css/'
            },
            dist_img: {
                expand: true,
                flatten: true,
                cwd: 'src/img',
                src: ['*.*'],
                dest: 'dist/img/'
            },
            dist_statics: {
                expand: true,
                flatten: true,
                src: ['src/plugin.json', 'LICENSE', 'README.md', 'CHANGELOG.md'],
                dest: 'dist/'
            }
        },

        babel: {
            options: {
                sourceMap: true,
                presets: ['es2015']
            },
            dist: {
                options: {
                    plugins: ['transform-es2015-modules-systemjs', 'transform-es2015-for-of']
                },
                files: [{
                    cwd: 'src',
                    expand: true,
                    src: ['**/*.js'],
                    dest: 'dist',
                    ext:'.js'
                }]
            }
        },

        typescript: {
            build: {
                src: ['dist/**/*.ts', '!**/*.d.ts'],
                dest: 'dist',
                options: {
                    module: 'system',
                    target: 'es5',
                    rootDir: 'dist/',
                    declaration: true,
                    emitDecoratorMetadata: true,
                    experimentalDecorators: true,
                    sourceMap: true,
                    noImplicitAny: false
                }
            }
        },

        watch: {
            files: ['src/**/*.ts', 'src/**/*.js', 'src/**/*.html', 'src/**/*.css', 'src/img/*.*', 'src/plugin.json', 'README.md', 'CHANGELOG.md'],
            tasks: ['default'],
            options: {
                debounceDelay: 250
            }
        }
    });

    grunt.registerTask('default', [
        'clean',
        'copy:dist_js',
        'typescript:build',
        'babel',
        'copy:dist_html',
        'copy:dist_css',
        'copy:dist_img',
        'copy:dist_statics'
    ]);
};