module.exports = {
  module: {
    loaders: [
      {
        test: /\.(png|jpg|gif)$/,
        loader: 'url?limit=20',
      },
    ],
  },
}
