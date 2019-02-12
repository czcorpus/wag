const path = require('path');
const build = require('./build');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const nodeExternals = require('webpack-node-externals');

// helper functions

const mkpath = (p) => path.resolve(__dirname, '.', p);


const SRC_PATH = mkpath('src');
const DIST_PATH = mkpath('dist');
const CONF = build.loadConf(mkpath('conf/conf.json'));

module.exports = (env) => ({
    mode: 'production',
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
        filename: 'service.js'
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
                test: /\.tsx?$/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            configFile: path.resolve(__dirname, 'tsconfig.server.json'),
                            transpileOnly: env ? !!env.TS_TRANSPILE_ONLY : false
                        }
                    }
                ]
            },
        ]
    },
    node: {
        console: false,
        global: false,
        process: false,
        Buffer: false,
        __filename: false,
        __dirname: false,
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
            new UglifyJsPlugin()
        ]
    },
    plugins: [
        new build.ProcTranslationsPlugin(SRC_PATH, DIST_PATH, CONF)
    ]
 });
