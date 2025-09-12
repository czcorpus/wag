import { fileURLToPath } from 'url';
import path from 'path';
import * as build from './build.js';
import nodeExternals from 'webpack-node-externals';

// helper functions
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mkpath = (p) => path.resolve(__dirname, '.', p);


const SRC_PATH = mkpath('src');
const DIST_PATH = mkpath('dist');
const CONF = build.loadConf(mkpath('conf/server.json'));

export default (env) => ({
    mode: process.env.NODE_ENV || 'production',
    externalsPresets: { node: true },
    externals: [
        nodeExternals({
            importType: 'module'
        })
    ],
    entry: {
        index: path.resolve(__dirname, 'src/js/server/index')
    },
    experiments: {
        outputModule: true
    },
    output: {
        path: path.resolve(__dirname, 'dist-server'),
        publicPath: CONF.distFilesUrl || '/',
        module: true,
        libraryTarget: 'module',
        filename: 'service.js',
        assetModuleFilename: '[hash][ext][query]'
    },
    resolve: {
        modules: [
            'node_modules',
            mkpath('dist/.compiled')
        ],
        extensions: ['.webpack.js', '.web.js', '.ts', '.tsx', '.jsx', '.js', '.json', '.css', '.less'],
        symlinks: false,
        extensionAlias: {
            '.js': ['.ts', '.js', '.tsx']
        }
    },
    module: {
        rules: [
            {
                test: /\.(png|jpg|gif|svg)$/,
                type: 'asset/resource',
                resourceQuery: /^(?!.*inline).*$/
            },
            {
                test: /\.svg$/,
                resourceQuery: /inline/,
                use: ['@svgr/webpack'],
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
                                            minify: !(process.env.NODE_ENV === 'development'),
                                            displayName: process.env.NODE_ENV === 'development',
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
            chunks: (chunk) => chunk.name !== 'sanitize-html' && chunk.name !== 'previewData',
            name: 'common'
        },
        minimizer: [] // no big deal on server-side (code is loaded once)
    },
    plugins: [
        new build.ProcTranslationsPlugin(SRC_PATH, DIST_PATH, CONF)
    ]
 });
