const { ImapFlow } = require("imapflow");
const { simpleParser } = require("mailparser");
const { EmailProvider } = require("./base");

class GmailProvider extends EmailProvider {
  static getName() {
    return "gmail";
  }

  static validateCredentials(credentials) {
    const required = ["email", "appPassword"];
    const missing = required.filter((k) => !credentials?.[k]);
    if (missing.length) {
      throw new Error(`Ontbrekende Gmail credentials: ${missing.join(", ")}`);
    }
  }

  async fetchEmails({ maxResults = 10, unreadOnly = true } = {}) {
    const { email, appPassword } = this.credentials;

    const client = new ImapFlow({
      host: "imap.gmail.com",
      port: 993,
      secure: true,
      auth: { user: email, pass: appPassword },
      logger: false,
    });

    await client.connect();
    const emails = [];

    try {
      await client.mailboxOpen("INBOX");

      const searchCriteria = unreadOnly ? { unseen: true } : { all: true };
      const uids = await client.search(searchCriteria, { uid: true });
      const recent = uids.slice(-maxResults).reverse();

      for await (const msg of client.fetch(recent, { envelope: true, flags: true, internalDate: true }, { uid: true })) {
        const from = msg.envelope.from?.[0];
        const fromStr = from
          ? from.name
            ? `${from.name} <${from.mailbox}@${from.host}>`
            : `${from.mailbox}@${from.host}`
          : "";

        const receivedAt = (msg.internalDate || msg.envelope.date)?.toISOString() || "";

        emails.push({
          id: String(msg.uid),
          subject: msg.envelope.subject || "(geen onderwerp)",
          from: fromStr,
          receivedAt,
          isRead: msg.flags.has("\\Seen"),
          snippet: "",
        });
      }
    } finally {
      await client.logout();
    }

    emails.sort((a, b) => {
      const da = a.receivedAt ? new Date(a.receivedAt).getTime() : 0;
      const db = b.receivedAt ? new Date(b.receivedAt).getTime() : 0;
      return db - da;
    });
    return emails;
  }
}

module.exports = { GmailProvider };
