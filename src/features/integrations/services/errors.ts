import "server-only";

/** Typed connect-flow error — `code` propagates as the callback route's `error` query param. */
export class IntegrationError extends Error {
  constructor(
    public code: string,
    message?: string
  ) {
    super(message ?? code);
  }
}
