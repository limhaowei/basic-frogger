import { join, resolve } from "path";
import HtmlWebpackPlugin from "html-webpack-plugin";

import { Configuration as WebpackConfiguration } from "webpack";
import { Configuration as WebpackDevServerConfiguration } from "webpack-dev-server";

interface Configuration extends WebpackConfiguration {
  devServer?: WebpackDevServerConfiguration;
}

export default (env: any, argv: any): Configuration => {
  const isProduction = argv.mode === "production";
  
  return {
    mode: isProduction ? "production" : "development",
    entry: {
      main: "./src/main.ts",
    },
    devtool: isProduction ? false : "inline-source-map",
    devServer: {
      static: join(__dirname, "build"),
      client: {
        overlay: true,
      },
      historyApiFallback: true,
      port: 4000,
      open: true,
      hot: true,
    },
    stats: {
      version: false,
      hash: false,
      entrypoints: false,
      assets: false,
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: "ts-loader",
          exclude: /node_modules/,
        },
        {
          test: /\.css$/i,
          use: ["style-loader", "css-loader"],
        },
      ],
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js"],
    },
    output: {
      filename: "[name].js",
      path: resolve(__dirname, "dist"),
      publicPath: isProduction ? "/basic-frogger/" : "/",
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: "./src/index.html",
      }),
    ],
  };
};
