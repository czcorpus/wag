const path = require('path');
const build = require('./build');
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TerserPlugin = require('terser-webpack-plugin');

// helper functions

const mkpath = (...p) => path.resolve(__dirname, '.', ...p);

process.env.NODE_ENV = 'production';

const SRC_PATH = mkpath('src');
const DIST_PATH = mkpath('dist');
const CONF = build.loadConf(mkpath('conf/server.json'));

module.exports = (env) => ({
    mode: 'production',
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
                test: /\.js$/,
                exclude: /(node_modules)/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                ['@babel/preset-env', {
                                    modules: false,
                                    targets: {
                                        browsers: ['last 3 versions'],
                                    },
                                    forceAllTransforms: true
                                }]
                            ],
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
                                    ['@babel/preset-env', {'modules': false }]
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
                    { loader: 'file-loader'},
                    { loader: 'extract-loader'},
                    { loader: 'css-loader' }
                ]
            },
            {
                test: /\.less$/,
                use: [
                    { loader: MiniCssExtractPlugin.loader },
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
            chunks: (chunk) => chunk.name !== 'sanitize-html' || chunk.name !== 'ioredis',
            name: 'common'
        },
        minimizer: [
            new OptimizeCSSAssetsPlugin({}),
            new TerserPlugin(),
        ]
    },
    //devtool: 'inline-source-map',
    plugins: [
        new build.ProcTranslationsPlugin(SRC_PATH, DIST_PATH, CONF),
        new MiniCssExtractPlugin({
            filename: "common.css"
          })
    ]
 });
