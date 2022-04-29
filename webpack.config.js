const { join } = require('path');
const ESLintPlugin = require('eslint-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
    mode: 'production',
    devtool: 'inline-source-map',
    entry: {
        contentscript: join(__dirname, 'src/salty.ts'),
        background: join(__dirname, 'src/twitch_background.ts'),
        popup: join(__dirname, 'src/popup.ts'),
        config: join(__dirname, 'src/config.ts'),
        matchdata: join(__dirname, 'src/matchdata.ts'),
        chat: join(__dirname, 'src/twitch_content.ts')
    },
    output: {
        path: join(__dirname, 'dist', 'js'),
        filename: '[name].js',
    },
    module: {
        rules: [
            {
                exclude: /node_modules/,
                test: /\.ts?$/,
                use: [
                    'ts-loader',
                ]
            }
        ],
    },
    plugins: [
      new ESLintPlugin(
        {
            extensions: [".ts"],
        }
      ),
      new CopyPlugin({
        patterns: [
          { from: "node_modules/moment/min/moment.min.js", to: "lib/moment.min.js" }
        ],
      }),
    ],
    resolve: {
        extensions: ['.ts', '.js'],
    },
    optimization: {
        minimize: false
    },
    externals: {
        moment: 'moment'
    },
};