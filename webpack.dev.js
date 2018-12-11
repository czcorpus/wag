const path = require('path');

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
            'node_modules'
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
                            publicPath: path.resolve(__dirname, 'src/img'),
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
        contentBase: path.resolve(__dirname, 'html'),
        compress: true,
        port: 9000,
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
 });