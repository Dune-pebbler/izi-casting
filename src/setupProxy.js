const { createProxyMiddleware } = require('http-proxy-middleware');
const https = require('https');
const http = require('http');

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
        proxyReq.setHeader('Accept', 'application/json');
      },
      logLevel: 'debug',
    })
  );

  // Server-side iCal proxy — avoids CORS issues with Google Calendar
  app.get('/api/ical', (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('Missing url parameter');

    const client = targetUrl.startsWith('https') ? https : http;
    const request = client.get(targetUrl, (proxyRes) => {
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      proxyRes.pipe(res);
    });
    request.on('error', (err) => res.status(502).send(`Proxy error: ${err.message}`));
    request.setTimeout(10000, () => { request.destroy(); res.status(504).send('Timeout'); });
  });
};
