const path = require('path');
const build = require('./build');
const nodeExternals = require('webpack-node-externals');

// helper functions

const mkpath = (p) => path.resolve(__dirname, '.', p);


const SRC_PATH = mkpath('src');
const DIST_PATH = mkpath('dist');
const CONF = build.loadConf(mkpath('conf/server.json'));

module.exports = (env) => ({
    mode: process.env.NODE_ENV || 'production',
    target: 'node',
    externals: [
        nodeExternals()
    ],
    entry: {
        index: path.resolve(__dirname, 'src/js/server/index')
    },
    output: {
        path: path.resolve(__dirname, 'dist-server'),
        libraryTarget: 'commonjs2',
        filename: 'service.js',
        assetModuleFilename: 'assets/[hash][ext][query]'
    },
    resolve: {
        alias: {}, // filled in dynamically
        modules: [
            'node_modules',
            mkpath('dist/.compiled')
        ],
        extensions: ['.webpack.js', '.web.js', '.ts', '.tsx', '.jsx', '.js', '.json', '.css', '.less'],
        symlinks: false
    },
    module: {
        rules: [
            {
                test: /\.(png|jpg|gif|svg)$/,
                type: 'asset/resource'
            },
            {
                test: /\.tsx?$/,
                exclude: /(node_modules)/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: build.loadConf(mkpath('./webpack.babel.json'))
                    }
                ]
            }
        ]
    },
    node: {
        global: false,
        __filename: false,
        __dirname: false,
    },
    stats: {
        colors: true
    },
    optimization: {
        splitChunks: {
            chunks: (chunk) => chunk.name !== 'sanitize-html',
            name: 'common'
        },
        minimizer: [] // no big deal on server-side (code is loaded once)
    },
    plugins: [
        new build.ProcTranslationsPlugin(SRC_PATH, DIST_PATH, CONF)
    ]
 });
