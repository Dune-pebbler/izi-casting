const { GmailProvider } = require("./providers/gmail");
const { getCache } = require("@vercel/functions");

// Cache TTL kept under the 5-minute client poll interval, so nearly every
// poll from every device/preview hits the cache instead of opening a new
// IMAP connection to Gmail.
const CACHE_TTL_SECONDS = 240;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { credentials, maxItems = 10, unreadOnly = true } = req.body || {};

  if (!credentials) {
    return res.status(400).json({ error: "Credentials ontbreken" });
  }

  try {
    GmailProvider.validateCredentials(credentials);

    const cache = getCache();
    // Keyed on the mailbox + query shape, not the password — mailboxes with
    // the same address always share a cache entry.
    const cacheKey = `email-fetch:${credentials.email}:${maxItems}:${unreadOnly}`;

    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.status(200).json({ emails: cached, cached: true });
    }

    const provider = new GmailProvider(credentials);
    const emails = await provider.fetchEmails({ maxResults: maxItems, unreadOnly });

    await cache.set(cacheKey, emails, {
      ttl: CACHE_TTL_SECONDS,
      tags: [`email-fetch:${credentials.email}`],
      name: "gmail-inbox-fetch",
    });

    return res.status(200).json({ emails, cached: false });
  } catch (err) {
    console.error("Email fetch error:", err.message);
    return res.status(500).json({ error: "Ophalen emails mislukt", details: err.message });
  }
};
