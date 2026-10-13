/**
 * An order that cannot be taken as entered, with the HTTP status the REST
 * endpoint answers with. The server action only uses the message.
 */
export class OrderEntryError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404
  ) {
    super(message);
    this.name = 'OrderEntryError';
  }
}
