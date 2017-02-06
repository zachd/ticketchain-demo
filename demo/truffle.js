module.exports = {
  build: {
    "index.html": "index.html",
    "ticket/index.html": "ticket/index.html",
    "admin/index.html": "admin/index.html",
    "app.js": [
      "javascripts/jquery-3.1.1.min.js",
      "javascripts/sweetalert2.min.js",
      "javascripts/app.js"
    ],
    "app.css": [
      "stylesheets/app.css",
      "stylesheets/sweetalert2.min.css"
    ],
    "images/": "images/"
  },
  rpc: {
    host: "localhost",
    port: 8545
  }
};
