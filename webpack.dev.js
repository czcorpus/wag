const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
    entry: {
        index: path.resolve(__dirname, 'src/js/index')
    },
    output: {
        filename: 'index.js',
        chunkFilename: 'common.js',
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'var',
        library: 'indexPage'

    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader',
                query: {
                    presets: ['env']
                }
            },
            {
                test: /\.css$/,
                use: ExtractTextPlugin.extract({
                    use: ['css-loader']
                })
            },
            {
                test: /\.(png|jpg|gif|svg)$/,
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            emitFile: false,
                            name: '../img/[name].[ext]'
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
    devtool: 'source-map',
    plugins: [
        new ExtractTextPlugin({
            filename: '[name].css'
        }),
        new CopyWebpackPlugin([
            {
                from: path.resolve(__dirname, './src/img'),
                to: path.resolve(__dirname, './dist/img')
            },
            {
                from: path.resolve(__dirname, './html'),
                to: path.resolve(__dirname, './dist')
            }
        ])
    ],
    devServer: {
        contentBase: path.resolve(__dirname, 'dist'),
        compress: true,
        port: 9000,
        host: 'localhost',
        inline: false
    },
 };