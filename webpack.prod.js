const path = require('path');
const build = require('./build');
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

// helper functions

const mkpath = (...p) => path.resolve(__dirname, '.', ...p);


const SRC_PATH = mkpath('src');
const DIST_PATH = mkpath('dist');
const CONF = build.loadConf(mkpath('conf/conf.json'));

module.exports = (env) => ({
    mode: 'production',
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
                test: /\.inline\.svg/,
                use: 'raw-loader',
            },
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
        },
        minimizer: [
            new OptimizeCSSAssetsPlugin({}),
            new UglifyJsPlugin()
        ]
    },
    devtool: 'inline-source-map',
    plugins: [
        new build.ProcTranslationsPlugin(SRC_PATH, DIST_PATH, CONF),
        new MiniCssExtractPlugin({
            filename: "common.css"
          })
    ]
 });
