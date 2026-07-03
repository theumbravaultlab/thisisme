// Minimal in-memory sliding-window rate limiter.
//
// IMPORTANT: state lives in this module's memory, so limits are enforced
// PER SERVER INSTANCE. On a single long-lived server (`next start`) that's
// enough to stop a runaway loop from draining the paid avatar pipeline. For
// multi-instance / serverless deployments (e.g. Vercel functions), back this
// with a shared store like Upstash Redis — the call signature can stay the same.

interface Bucket {
  hits: number[]; // request timestamps (ms), newest last
  windowMs: number;
}

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

// Drop fully-expired buckets occasionally so the map can't grow unbounded as
// unique IPs come and go. Cheap: runs at most once a minute.
function maybeSweep(now: number): void {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, b] of buckets) {
    const last = b.hits[b.hits.length - 1] ?? 0;
    if (now - last > b.windowMs) buckets.delete(key);
  }
}

// Records a hit against `key` and reports whether it's within `limit` per
// `windowMs`. A denied call does NOT add another hit.
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  maybeSweep(now);

  const cutoff = now - windowMs;
  const prev = buckets.get(key)?.hits ?? [];
  const hits = prev.filter((t) => t > cutoff);

  if (hits.length >= limit) {
    buckets.set(key, { hits, windowMs });
    const retryAfterSec = Math.ceil((hits[0] + windowMs - now) / 1000);
    return { ok: false, remaining: 0, retryAfterSec };
  }

  hits.push(now);
  buckets.set(key, { hits, windowMs });
  return { ok: true, remaining: limit - hits.length, retryAfterSec: 0 };
}
