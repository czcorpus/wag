const path = require('path');
const build = require('./build');


// helper functions

const mkpath = (p) => path.resolve(__dirname, '.', p);


const SRC_PATH = mkpath('src');
const DIST_PATH = mkpath('dist');
const CONF = build.loadConf(mkpath('conf/server.json'));

module.exports = (env) => ({
    mode: 'development',
    entry: {
        index: path.resolve(__dirname, 'src/js/page/index')
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
        publicPath: CONF.distFilesUrl || '',
        libraryTarget: 'var',
        library: '[name]Page'
    },
    resolve: {
        alias: {}, // filled in dynamically
        modules: [
            'node_modules',
            mkpath('dist/.compiled')
        ],
        extensions: ['.webpack.js', '.web.js', '.ts', '.tsx', '.jsx', '.js', '.json', '.css', '.less'],
        fallback: {
            'path': require.resolve('path-browserify'),
            'stream': require.resolve('stream-browserify')
        },
        symlinks: false
    },
    module: {
        rules: [
            {
                test: /\.(png|jpg|gif|svg)$/,
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            emitFile: false,
                            name: '[name].[ext]',
                            publicPath: CONF.staticFilesUrl,
                        }
                    }
                ]
            },
            {
                test: /\.js$/,
                exclude: /(node_modules)/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                ['@babel/preset-env', { "modules": false }]
                            ]
                        }
                    }
                ]
            },
            {
                test: /\.tsx?$/,
                exclude: /(node_modules)/,
                use: [
                    {
                        loader: 'awesome-typescript-loader',
                        options: {
                            useBabel: true,
                            babelOptions: {
                                babelrc: false,
                                presets: [
                                    ['@babel/preset-env', {'targets': 'last 2 versions, ie 11', 'modules': false }]
                                ]
                            },
                            babelCore: '@babel/core',
                            useCache: true
                        }
                    }
                ]
            },
            {
                test: /\.css$/,
                use: [
                    { loader: 'style-loader'},
                    { loader: 'css-loader' }
                ]
            },
            {
                test: /\.less$/,
                use: [
                    { loader: 'style-loader'},
                    { loader: 'css-loader' },
                    {
                        loader: 'less-loader',
                        options: {
                            lessOptions: {
                                strictMath: true,
                                noIeCompat: true
                            }
                        }
                    }
                ]
            },
        ]
    },
    stats: {
        colors: true
    },
    optimization: {
        splitChunks: {
            chunks: (chunk) => chunk.name !== 'sanitize-html',
            name: 'common'
        },
    },
    devtool: 'inline-source-map',
    devServer: {
        // disableHostCheck: true,
        public: 'portal.korpus.test',
        publicPath: (CONF.develServer || {}).urlRootPath + 'dist/',
        contentBase: path.resolve(__dirname, 'html'),
        compress: true,
        port: (CONF.develServer || {}).port || 9000,
        host: (CONF.develServer || {}).host || 'localhost',
        disableHostCheck: true, // TODO
        inline: true,
        before: function(app) {
            // In the devel-server mode, all the css is delivered via Webpack
            // but at the same time our hardcoded <link rel="stylesheet" ... />
            // elements cause browser to load non-available styles.
            // So we always return an empty stuff with proper content type.
            app.get('/*.css', function(req, res) {
                res.set('Content-Type', 'text/css');
                res.send('');
            });
        }
    },
    plugins: [
        new build.ProcTranslationsPlugin(SRC_PATH, DIST_PATH, CONF)
    ],
    target: ['web', 'es5']
 });