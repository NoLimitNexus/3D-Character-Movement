const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './src/index.js', // your main entry point
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/', // needed for dev server
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    hot: true,   // enable HMR
    port: 8080,  // or whichever port you prefer
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html', // copies this file into dist/
      filename: 'index.html',       // output file
    }),
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'babel-loader', // transpile modern JS if needed
      },
    ],
  },
};
