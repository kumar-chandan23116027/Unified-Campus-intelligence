export class HttpError extends Error {
  constructor(status, message, code = "HTTP_ERROR", details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function badRequest(message, details) {
  return new HttpError(400, message, "BAD_REQUEST", details);
}

export function unauthorized(message = "Authentication required") {
  return new HttpError(401, message, "UNAUTHORIZED");
}

export function forbidden(message = "Insufficient permissions") {
  return new HttpError(403, message, "FORBIDDEN");
}

export function notFound(message = "Resource not found") {
  return new HttpError(404, message, "NOT_FOUND");
}

export function methodNotAllowed(message = "Method not allowed") {
  return new HttpError(405, message, "METHOD_NOT_ALLOWED");
}

export function payloadTooLarge(message = "Request body too large") {
  return new HttpError(413, message, "PAYLOAD_TOO_LARGE");
}

export function tooManyRequests(message = "Too many requests") {
  return new HttpError(429, message, "TOO_MANY_REQUESTS");
}
