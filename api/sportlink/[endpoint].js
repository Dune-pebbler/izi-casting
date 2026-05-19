const VALID_ENDPOINTS = ['programma', 'uitslagen', 'poulestand', 'teams'];

export default async function handler(req, res) {
  const { endpoint, ...params } = req.query;

  if (!endpoint || !VALID_ENDPOINTS.includes(endpoint)) {
    return res.status(400).json({ error: 'Invalid endpoint' });
  }

  if (!params.client_id) {
    return res.status(400).json({ error: 'Missing client_id' });
  }

  const query = new URLSearchParams(params).toString();
  const url = `https://data.sportlink.com/${endpoint}?${query}`;

  try {
    const upstream = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Upstream returned ${upstream.status}` });
    }

    const data = await upstream.json();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ error: 'Failed to fetch Sportlink data' });
  }
}
