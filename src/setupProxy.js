const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api/teletekst',
    createProxyMiddleware({
      target: 'https://teletekst-data.nos.nl',
      changeOrigin: true,
      pathRewrite: {
        '^/api/teletekst': '/json',
      },
      onProxyReq: (proxyReq) => {
        // Add headers if needed
        proxyReq.setHeader('Accept', 'application/json');
      },
      logLevel: 'debug',
    })
  );
};
