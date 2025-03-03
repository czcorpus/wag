import { fileURLToPath } from 'url';
import path from 'path';
import * as build from './build.js';


// helper functions
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mkpath = (p) => path.resolve(__dirname, '.', p);


const SRC_PATH = mkpath('src');
const DIST_PATH = mkpath('dist');
const CONF = build.loadConf(mkpath('conf/server.json'));

export default (env) => ({
    mode: 'development',
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
        modules: [
            'node_modules',
            mkpath('dist/.compiled')
        ],
        extensions: ['.webpack.js', '.web.js', '.ts', '.tsx', '.jsx', '.js', '.json', '.css', '.less'],
        fallback: {
            'path': path.resolve(__dirname, 'node_modules/path-browserify/index.js'),
            'stream': path.resolve(__dirname, 'node_modules/stream-browserify/index.js')

        },
        symlinks: false,
        extensionAlias: {
            '.js': ['.ts', '.js', '.tsx']
        }
    },
    module: {
        rules: [
            {
                test: /\.(png|jpg|gif|svg)$/,
                type: 'asset/resource'
            },
            {
                test: /\.tsx?$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: 'swc-loader',
                    options: {
                        jsc: {
                            parser: {
                                syntax: 'typescript',
                                tsx: true,
                                decorators: false,
                                dynamicImport: false
                            },
                            target: 'es2016',
                            experimental: {
                                plugins: [
                                    [
                                        "@swc/plugin-styled-components",
                                        {
                                            minify: false,
                                            displayName: true,
                                            ssr: true
                                        }
                                    ]
                                ]
                            }
                        },
                        module: {
                            type: 'es6'
                        }
                    }
                }
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
    },
    devtool: 'inline-source-map',
    devServer: {
        //allowedHosts: ['localhost', '127.0.0.1', 'portal.korpus.test', 'korpus.test', 'wag.korpus.test'],
        allowedHosts: "all",
        port: (CONF.develServer || {}).port || 9000,
        host: (CONF.develServer || {}).host || '127.0.0.1',
        static: {
            directory: path.resolve(__dirname, 'html'),
            publicPath: (CONF.develServer || {}).urlRootPath + 'dist/'
        },
        client: {
            webSocketURL: 'ws://wag.korpus.test/ws', // TODO configurable
        },
        headers: {
            "Access-Control-Allow-Origin": "*",
        },
        liveReload: false
    },
    plugins: [
        new build.ProcTranslationsPlugin(SRC_PATH, DIST_PATH, CONF)
    ]
 });