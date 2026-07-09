// Minimal in-memory fixed-window rate limiter, keyed per user + action.
// Enough to stop scripted spam against write endpoints. Note: the counter is
// per server instance (fine for a single Node server; on serverless each
// instance counts separately, which still bounds abuse per instance).
const buckets = new Map();
const MAX_BUCKETS = 5000;

export function rateLimit(key, { limit = 20, windowMs = 60_000 } = {}) {
  const now = Date.now();

  // Keep the map from growing without bound.
  if (buckets.size > MAX_BUCKETS) {
    for (const [k, b] of buckets) {
      if (now - b.start >= windowMs) buckets.delete(k);
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || now - bucket.start >= windowMs) {
    buckets.set(key, { start: now, count: 1 });
    return { ok: true };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.start + windowMs - now) / 1000)),
    };
  }
  return { ok: true };
}

// Shared 429 response so every route phrases it the same way.
export function rateLimitResponse(retryAfterSeconds) {
  return Response.json(
    { error: `Too many requests — try again in ${retryAfterSeconds}s.` },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}
