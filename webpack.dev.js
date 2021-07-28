const path = require('path');
const build = require('./build');


// helper functions

const mkpath = (p) => path.resolve(__dirname, '.', p);


const SRC_PATH = mkpath('src');
const DIST_PATH = mkpath('dist');
const CONF = build.loadConf(mkpath('conf/server.json'));

module.exports = (env) => ({
    mode: 'development',
    target: ['web', 'es5'],
    entry: {
        index: path.resolve(__dirname, 'src/js/page/index')
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
        publicPath: CONF.distFilesUrl || '',
        libraryTarget: 'var',
        library: '[name]Page',
        assetModuleFilename: 'assets/[hash][ext][query]'
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
                type: 'asset/resource'
            },
            {
                test: /\.tsx?$/,
                exclude: /(node_modules)/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: build.createBabelOptions('development')
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
    },
    devtool: 'inline-source-map',
    devServer: {
        // disableHostCheck: true,
        public: 'localhost',
        publicPath: (CONF.develServer || {}).urlRootPath + 'dist/',
        contentBase: path.resolve(__dirname, 'html'),
        compress: true,
        port: (CONF.develServer || {}).port || 9000,
        host: (CONF.develServer || {}).host || 'localhost',
        disableHostCheck: true, // TODO
        inline: true
    },
    plugins: [
        new build.ProcTranslationsPlugin(SRC_PATH, DIST_PATH, CONF)
    ]
 });