const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCSSExtractPlugin = require("mini-css-extract-plugin");
const path = require("path");
const portFinderSync = require("portfinder-sync");

module.exports = {
  entry: path.resolve(__dirname, "../src/main.js"),
  output: {
    filename: "bundle.[contenthash].js",
    path: path.resolve(__dirname, "../dist"),
  },
  stats: {
    children: true,
  },
  devtool: "source-map",
  devServer: {
    host: "localhost",
    port: portFinderSync.getPort(8080),
    open: true,
    https: false,
    client: {
      overlay: true,
    },
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [{ from: path.resolve(__dirname, "../static") }],
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "../src/index.html"),
    }),
    new MiniCSSExtractPlugin(),
  ],
  module: {
    rules: [
      // HTML
      {
        test: /\.(html)$/,
        use: ["html-loader"],
      },

      // JS
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: ["babel-loader"],
      },

      // CSS
      {
        test: /\.css$/,
        use: [MiniCSSExtractPlugin.loader, "css-loader"],
      },

      // Images
      {
        test: /\.(jpg|png|gif|svg)$/,
        use: "file-loader",
      },

      // Fonts
      {
        test: /\.(ttf|eot|woff|woff2)$/,
        use: "file-loader",
      },
    ],
  },
};
