const path = require('path');
const nodeExternals = require('webpack-node-externals');
const FileManagerPlugin = require('filemanager-webpack-plugin');

const isProduction = true;
const mode = isProduction ? 'production' : 'development';
const devtool = isProduction ? false : 'inline-source-map';

module.exports = {
  entry: './server.js',
  target: 'node',
  mode,
  devtool,
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
          }
        ]
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.json' ]
  },
  output: {
    filename: 'server.js',
    path: path.resolve(__dirname, 'build'),
    library: 'server',    // very important line
    libraryTarget: 'umd',    // very important line
    umdNamedDefine: true     // very important line
  },
  externals: [nodeExternals()], // in order to ignore all modules in node_modules folder
  externalsPresets: {
      node: true // in order to ignore built-in modules like path, fs, etc. 
  },
  node: {
    __dirname: false,
    __filename: false,
  },
  plugins: [
    new FileManagerPlugin({
      events: {
        onEnd: {
          copy: [
            { source: './certs', destination: './build/certs' },
            { source: './src/public', destination: './build/public' },
            { source: './config', destination: './build/config' },
            { source: './auth/upload/avatars', destination: './build/avatars' },
            { source: './auth/upload/champions', destination: './build/champions' },
            { source: './auth/upload/passports', destination: './build/passports' },
          ],
        }
      },
      runTasksInSeries: false,
      runOnceInWatchMode: false,
    })
  ],
};