const { CheckerPlugin } = require('awesome-typescript-loader');
const { join } = require('path');

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
                    'awesome-typescript-loader?{configFileName: "tsconfig.json"}',
                    'eslint-loader'
                ]
            }
        ],
    },
    plugins: [
        new CheckerPlugin()
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