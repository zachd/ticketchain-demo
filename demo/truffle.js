module.exports = {
  build: {
    "index.html": "index.html",
    "print/index.html": "print/index.html",
    "app.js": [
      "javascripts/jquery-1.12.4.min.js",
      "javascripts/sweetalert.min.js",
      "javascripts/app.js"
    ],
    "app.css": [
      "stylesheets/app.css",
      "stylesheets/alerts.css"
    ],
    "images/": "images/"
  },
  rpc: {
    host: "localhost",
    port: 8545
  }
};
