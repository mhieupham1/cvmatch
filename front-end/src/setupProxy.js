const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // API proxy
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8000',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '', // remove /api prefix when forwarding
      },
    })
  );
  
  // Uploads proxy - specific for static files
  app.use(
    '/uploads',
    createProxyMiddleware({
      target: 'http://localhost:8000',
      changeOrigin: true,
    })
  );
};