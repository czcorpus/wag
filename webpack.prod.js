import { fileURLToPath } from 'url';
import path from 'path';
import * as build from './build.js';
import TerserPlugin from 'terser-webpack-plugin';

// helper functions
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mkpath = (...p) => path.resolve(__dirname, '.', ...p);

process.env.NODE_ENV = 'production';

const SRC_PATH = mkpath('src');
const DIST_PATH = mkpath('dist');
const CONF = build.loadConf(mkpath('conf/server.json'));

export default (env) => ({
    mode: 'production',
    target: ['web', 'es5'],
    entry: {
        index: path.resolve(__dirname, 'src/js/page/index')
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
        publicPath: CONF.distFilesUrl || '/',
        libraryTarget: 'var',
        library: '[name]Page',
        assetModuleFilename: '[hash][ext][query]'
    },
    resolve: {
        alias: {}, // filled in dynamically
        modules: [
            'node_modules',
            mkpath('dist/.compiled')
        ],
        extensions: ['.webpack.js', '.web.js', '.ts', '.tsx', '.jsx', '.js', '.json', '.css', '.less'],
        fallback: {
            'buffer': import.meta.resolve('buffer/'),
            'path': import.meta.resolve('path-browserify/'),
            'stream': import.meta.resolve('stream-browserify/')
        },
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
                        options: build.createBabelOptions('production')
                    }
                ]
            }
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
        minimizer: [
            new TerserPlugin()
        ]
    },
    plugins: [
        new build.ProcTranslationsPlugin(SRC_PATH, DIST_PATH, CONF),
    ]
 });
