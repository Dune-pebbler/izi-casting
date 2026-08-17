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

  // Server-side iCal batch proxy — avoids CORS issues with Google Calendar,
  // fetches every calendar in one round trip (mirrors api/ical-batch.js).
  app.get('/api/ical-batch', async (req, res) => {
    const { urls } = req.query;
    if (!urls) return res.status(400).json({ error: 'Missing urls parameter' });

    const rawUrls = urls.split(',').map((u) => decodeURIComponent(u)).filter(Boolean);
    if (!rawUrls.length) return res.status(400).json({ error: 'No valid urls provided' });

    const fetchOne = (url) =>
      new Promise((resolve) => {
        let parsedUrl;
        try {
          parsedUrl = new URL(url);
        } catch {
          return resolve({ url, ok: false, error: 'Invalid URL' });
        }
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          return resolve({ url, ok: false, error: 'Only http and https URLs are allowed' });
        }

        const client = parsedUrl.protocol === 'https:' ? https : http;
        const request = client.get(url, (proxyRes) => {
          let data = '';
          proxyRes.setEncoding('utf8');
          proxyRes.on('data', (chunk) => (data += chunk));
          proxyRes.on('end', () => resolve({ url, ok: true, text: data }));
        });
        request.on('error', (err) => resolve({ url, ok: false, error: err.message }));
        request.setTimeout(10000, () => {
          request.destroy();
          resolve({ url, ok: false, error: 'Timeout' });
        });
      });

    const results = await Promise.all(rawUrls.map(fetchOne));
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json({ results });
  });
};
