const { GmailProvider } = require("./providers/gmail");

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
    const provider = new GmailProvider(credentials);
    const emails = await provider.fetchEmails({ maxResults: maxItems, unreadOnly });
    return res.status(200).json({ emails });
  } catch (err) {
    console.error("Email fetch error:", err.message);
    return res.status(500).json({ error: "Ophalen emails mislukt", details: err.message });
  }
};
