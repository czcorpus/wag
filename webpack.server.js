const path = require('path');
const build = require('./build');
const nodeExternals = require('webpack-node-externals');

// helper functions

const mkpath = (p) => path.resolve(__dirname, '.', p);


const SRC_PATH = mkpath('src');
const DIST_PATH = mkpath('dist');
const CONF = build.loadConf(mkpath('conf/server.json'));

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
        extensions: ['.webpack.js', '.web.js', '.ts', '.tsx', '.jsx', '.js', '.json', '.css', '.less'],
        symlinks: false
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: [
                    {
                        loader: 'babel-loader',
                        /*
                        options: {
                            configFileName: path.resolve(__dirname, 'tsconfig.server.json'),
                            transpileOnly: env ? !!env.TS_TRANSPILE_ONLY : false,
                            useCache: false
                        }
                        */
                    }
                ]
            },
            {
                test: /\.css$/,
                use: 'null-loader'
            },
            {
                test: /\.less$/,
                use: 'null-loader'
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
            chunks: (chunk) => chunk.name !== 'sanitize-html' || chunk.name !== 'ioredis',
            name: 'common'
        },
        minimizer: [] // no big deal on server-side (code is loaded once)
    },
    plugins: [
        new build.ProcTranslationsPlugin(SRC_PATH, DIST_PATH, CONF)
    ]
 });
