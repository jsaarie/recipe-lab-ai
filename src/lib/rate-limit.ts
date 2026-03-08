import { NextResponse } from "next/server";

/**
 * In-memory sliding-window rate limiter.
 *
 * Each limiter instance tracks requests by a caller-supplied key
 * (e.g. IP address, user ID, or email). Expired entries are lazily
 * pruned on every check to prevent unbounded memory growth.
 *
 * NOTE: In a multi-instance / serverless environment each instance
 * keeps its own window. This still protects against automated attacks
 * because any single instance will enforce the limit. For stricter
 * guarantees, swap for a Redis-backed implementation later.
 */

interface RateLimitEntry {
  timestamps: number[];
}

interface RateLimiterOptions {
  /** Maximum number of requests allowed within the window */
  max: number;
  /** Window size in milliseconds */
  windowMs: number;
}

export class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private max: number;
  private windowMs: number;

  constructor(opts: RateLimiterOptions) {
    this.max = opts.max;
    this.windowMs = opts.windowMs;
  }

  /**
   * Returns `true` if the key has exceeded the rate limit.
   * Automatically records the current attempt.
   */
  check(key: string): { limited: boolean; remaining: number; retryAfterMs: number } {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let entry = this.store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      this.store.set(key, entry);
    }

    // Drop timestamps outside the current window
    entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

    if (entry.timestamps.length >= this.max) {
      const oldestInWindow = entry.timestamps[0];
      const retryAfterMs = oldestInWindow + this.windowMs - now;
      return { limited: true, remaining: 0, retryAfterMs };
    }

    entry.timestamps.push(now);
    return { limited: false, remaining: this.max - entry.timestamps.length, retryAfterMs: 0 };
  }

  /** Lazily prune all fully-expired entries (call periodically or on check). */
  prune() {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    for (const [key, entry] of this.store) {
      entry.timestamps = entry.timestamps.filter((t) => t > windowStart);
      if (entry.timestamps.length === 0) this.store.delete(key);
    }
  }
}

// ─── Pre-configured limiters ────────────────────────────────────────
// These are module-level singletons so they persist across requests
// within the same serverless instance.

/** Login: 5 attempts per 15 minutes (per email) */
export const loginLimiter = new RateLimiter({ max: 5, windowMs: 15 * 60 * 1000 });

/** MFA verify: 5 attempts per 15 minutes (per user ID) */
export const mfaVerifyLimiter = new RateLimiter({ max: 5, windowMs: 15 * 60 * 1000 });

/** Registration: 10 attempts per hour (per IP) */
export const registerLimiter = new RateLimiter({ max: 10, windowMs: 60 * 60 * 1000 });

/** Forgot password: 5 attempts per hour (per IP) */
export const forgotPasswordLimiter = new RateLimiter({ max: 5, windowMs: 60 * 60 * 1000 });

/** MFA setup: 5 attempts per 15 minutes (per user ID) */
export const mfaSetupLimiter = new RateLimiter({ max: 5, windowMs: 15 * 60 * 1000 });

// ─── Helper ─────────────────────────────────────────────────────────

/** Extract client IP from a NextRequest (works on Vercel and locally). */
export function getClientIp(req: { headers: { get(name: string): string | null } }): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

/** Standard 429 response with Retry-After header. */
export function rateLimitResponse(retryAfterMs: number) {
  const retryAfterSec = Math.ceil(retryAfterMs / 1000);
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    }
  );
}

// Prune all stores every 5 minutes to prevent memory leaks
setInterval(() => {
  loginLimiter.prune();
  mfaVerifyLimiter.prune();
  registerLimiter.prune();
  forgotPasswordLimiter.prune();
  mfaSetupLimiter.prune();
}, 5 * 60 * 1000).unref();
