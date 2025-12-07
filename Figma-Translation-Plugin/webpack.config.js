const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
require('dotenv').config();

module.exports = (env, argv) => {
  const mode = argv.mode || 'development';

  return [
    // Configuration for code.ts (plugin backend)
    {
      mode: mode,
      entry: './code.ts',
      module: {
        rules: [
          {
            test: /\.ts$/,
            use: 'ts-loader',
            exclude: /node_modules/,
          },
        ],
      },
      resolve: {
        extensions: ['.ts', '.js'],
      },
      output: {
        filename: 'code.js',
        path: path.resolve(__dirname),
      },
    },
    
    // Configuration for ui.html (plugin frontend)
    {
      mode: mode,
      entry: './ui-entry.js',
      plugins: [
        new HtmlWebpackPlugin({
          template: './ui.html',
          filename: 'ui-compiled.html',
          inject: false,
        }),
        new webpack.DefinePlugin({
          'process.env.OPENAI_API_KEY': JSON.stringify(process.env.OPENAI_API_KEY),
        }),
      ],
      output: {
        filename: 'ui-bundle.js',
        path: path.resolve(__dirname, 'dist'),
      },
    },
  ];
};