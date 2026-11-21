const buckets = new Map();

export function createRateLimiter() {
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
  const maxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 120);

  return (request) => {
    const address = request.socket?.remoteAddress || "unknown";
    const now = Date.now();
    let bucket = buckets.get(address);

    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(address, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, maxRequests - bucket.count);
    const allowed = bucket.count <= maxRequests;
    return {
      allowed,
      remaining,
      resetAt: bucket.resetAt
    };
  };
}
