import { getCache } from '@vercel/functions';
import {
  DPDM_ENDPOINTS,
  getDpdmConfig,
  isDpdmRequestAllowed,
} from '../_lib/dpdm.js';

// DPDM throttles at 60 req/min, while every display/preview polls on its
// own — cache the upstream response so all screens share one fetch.
const CACHE_TTL_SECONDS = 60;
const UPSTREAM_TIMEOUT_MS = 10000;

export default async function handler(req, res) {
  // Never let a CDN/browser cache this: the data is access-controlled.
  res.setHeader('Cache-Control', 'private, no-store');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { endpoint } = req.query;
  const upstreamPath = DPDM_ENDPOINTS[endpoint];
  if (!upstreamPath) {
    return res.status(404).json({ error: 'Onbekend DPDM endpoint' });
  }

  try {
    if (!(await isDpdmRequestAllowed(req))) {
      return res.status(403).json({ error: 'Geen toegang' });
    }
  } catch (err) {
    console.error('[dpdm] auth check failed:', err.message);
    return res.status(500).json({ error: 'Toegangscontrole mislukt' });
  }

  const { baseUrl, token } = getDpdmConfig();
  if (!baseUrl || !token) {
    return res
      .status(500)
      .json({ error: 'DPDM_API_URL / DPDM_API_TOKEN zijn niet ingesteld' });
  }

  const cache = getCache();
  const cacheKey = `dpdm:${endpoint}`;

  try {
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.status(200).json({ ...cached, cached: true });
    }
  } catch (err) {
    console.warn('[dpdm] cache read failed:', err.message);
  }

  try {
    const upstream = await fetch(`${baseUrl}${upstreamPath}`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'izi-casting/1.0 (+https://www.izi-casting.com)',
      },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    if (!upstream.ok) {
      // Include what answered and a snippet of the body: a 401 comes from
      // DPDM itself (wrong token), a 403 usually from a firewall/WAF in
      // front of it that is blocking Vercel's IPs.
      const server = upstream.headers.get('server') || 'onbekend';
      const snippet = (await upstream.text().catch(() => ''))
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 160);
      console.error(
        `[dpdm] ${endpoint} upstream returned ${upstream.status} (server: ${server}): ${snippet}`,
      );
      return res.status(502).json({
        error: `DPDM gaf status ${upstream.status} (server: ${server})${snippet ? ` – ${snippet}` : ''}`,
      });
    }

    const json = await upstream.json();
    const payload = {
      data: Array.isArray(json?.data) ? json.data : [],
      fetchedAt: new Date().toISOString(),
    };

    try {
      await cache.set(cacheKey, payload, {
        ttl: CACHE_TTL_SECONDS,
        tags: ['dpdm'],
        name: 'dpdm-fetch',
      });
    } catch (err) {
      console.warn('[dpdm] cache write failed:', err.message);
    }

    return res.status(200).json({ ...payload, cached: false });
  } catch (err) {
    console.error(`[dpdm] ${endpoint} fetch failed:`, err.message);
    return res.status(502).json({ error: 'Ophalen DPDM data mislukt' });
  }
}
