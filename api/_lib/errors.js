export class AuthError extends Error {
  constructor(message = 'Invalid or missing API key') {
    super(message);
    this.status = 401;
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message);
    this.status = 404;
  }
}
