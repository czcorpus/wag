const path = require('path');
const build = require('./build');


// helper functions

const mkpath = (p) => path.resolve(__dirname, '.', p);


const SRC_PATH = mkpath('src');
const DIST_PATH = mkpath('dist');
const CONF = build.loadConf(mkpath('conf.json'));
console.log('public path: ', (CONF.develServer || {}).urlRootPath);

module.exports = (env) => ({
    mode: 'development',
    entry: {
        index: path.resolve(__dirname, 'src/js/index')
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'var',
        library: '[name]Page'
    },
    resolve: {
        alias: {}, // filled in dynamically
        modules: [
            'node_modules',
            mkpath('dist/.compiled')
        ],
        extensions: ['.webpack.js', '.web.js', '.ts', '.tsx', '.jsx', '.js', '.json', '.css', '.less']
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
                test: /\.tsx?$/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            transpileOnly: env ? !!env.TS_TRANSPILE_ONLY : false
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
                            strictMath: true,
                            noIeCompat: true
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
            chunks: 'all',
            name: 'common'
        }
    },
    devtool: 'inline-source-map',
    optimization: {
        splitChunks: {
            chunks: 'all',
            name: 'common'
        }
    },
    devServer: {
        // disableHostCheck: true,
        public: 'kontext.korpus.test',
        publicPath: (CONF.develServer || {}).urlRootPath + 'dist/',
        contentBase: path.resolve(__dirname, 'html'),
        compress: true,
        port: (CONF.develServer || {}).port || 9000,
        host: 'localhost',
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
    ]
 });