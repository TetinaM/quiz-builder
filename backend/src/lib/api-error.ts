/** Thrown deliberately by route handlers/middleware to signal a specific
 * HTTP status + client-safe message. Caught by middleware/error-handler.ts. */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
