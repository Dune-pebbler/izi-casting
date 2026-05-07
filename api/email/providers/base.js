class EmailProvider {
  constructor(credentials) {
    this.credentials = credentials;
  }

  // Returns: [{ id, subject, from, receivedAt, isRead, snippet }]
  async fetchEmails(_options = {}) {
    throw new Error("fetchEmails() must be implemented by subclass");
  }

  static getName() {
    throw new Error("getName() must be implemented by subclass");
  }

  static validateCredentials(_credentials) {
    throw new Error("validateCredentials() must be implemented by subclass");
  }
}

module.exports = { EmailProvider };
