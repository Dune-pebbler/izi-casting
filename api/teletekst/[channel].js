export default async function handler(req, res) {
  const { channel } = req.query;

  if (!channel || !/^\d{1,4}(-\d+)?$/.test(channel)) {
    return res.status(400).json({ error: 'Invalid channel' });
  }

  try {
    const upstream = await fetch(`https://teletekst-data.nos.nl/json/${channel}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Upstream returned ${upstream.status}` });
    }

    const contentType = upstream.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return res.status(502).json({ error: 'Upstream did not return JSON' });
    }

    const data = await upstream.json();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ error: 'Failed to fetch teletekst data' });
  }
}
