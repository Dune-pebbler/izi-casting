// Fetches multiple iCal feeds in a single request so the client (and Vercel's
// CDN cache) only needs one call per agenda slide, regardless of how many
// calendars it lists — instead of one Edge Request per calendar.
export default async function handler(req, res) {
  const { urls } = req.query;

  if (!urls) {
    return res.status(400).json({ error: 'Missing urls parameter' });
  }

  const rawUrls = urls.split(',').map((u) => decodeURIComponent(u)).filter(Boolean);

  if (!rawUrls.length) {
    return res.status(400).json({ error: 'No valid urls provided' });
  }

  const results = await Promise.all(
    rawUrls.map(async (url) => {
      let parsedUrl;
      try {
        parsedUrl = new URL(url);
      } catch {
        return { url, ok: false, error: 'Invalid URL' };
      }

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return { url, ok: false, error: 'Only http and https URLs are allowed' };
      }

      try {
        const upstream = await fetch(url, {
          headers: {
            Accept: 'text/calendar, application/octet-stream, */*',
            'User-Agent': 'Mozilla/5.0 (compatible; ICalReader/1.0)',
          },
        });

        if (!upstream.ok) {
          return { url, ok: false, error: `Upstream returned ${upstream.status}` };
        }

        const buffer = await upstream.arrayBuffer();
        const text = new TextDecoder('utf-8').decode(buffer);
        return { url, ok: true, text };
      } catch (err) {
        return { url, ok: false, error: `Failed to fetch calendar: ${err.message}` };
      }
    }),
  );

  res.setHeader('Cache-Control', 's-maxage=270, stale-while-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(200).json({ results });
}
