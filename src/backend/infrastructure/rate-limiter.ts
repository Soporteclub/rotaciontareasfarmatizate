// Simple in-memory rate limiter for admin endpoints.
//
// FIX (SEC-05): prevents brute-force attacks against the admin key by limiting
// failed attempts per IP. For multi-instance deployments, swap the Map for Redis
// or Upstash Rate Limit.
//
// Scope: per-IP, sliding window. Allows `maxAttempts` failures within
// `windowMs`, then blocks for the remainder of the window.

import type { NextRequest } from "next/server";

type AttemptLog = { count: number; firstAttempt: number; blocked: boolean };

const attempts = new Map<string, AttemptLog>();

// Cleanup old entries every 5 minutes to prevent unbounded growth
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  for (const [ip, log] of attempts) {
    if (now - log.firstAttempt > RATE_LIMIT_WINDOW_MS * 2) {
      attempts.delete(ip);
    }
  }
  lastCleanup = now;
}

export const RATE_LIMIT_MAX_ATTEMPTS = 10;
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Check whether an IP is rate-limited. Returns true if the caller should be
 * blocked (too many failed attempts within the window).
 */
export function isRateLimited(ip: string): boolean {
  cleanup();
  const log = attempts.get(ip);
  if (!log) return false;

  const now = Date.now();
  if (now - log.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    attempts.delete(ip);
    return false;
  }

  return log.count >= RATE_LIMIT_MAX_ATTEMPTS;
}

/**
 * Record a failed attempt for an IP. Call this after a rejected key validation.
 */
export function recordFailedAttempt(ip: string): void {
  cleanup();
  const now = Date.now();
  const log = attempts.get(ip);

  if (!log || now - log.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    attempts.set(ip, { count: 1, firstAttempt: now, blocked: false });
  } else {
    log.count += 1;
  }
}

/**
 * Reset the attempt log for an IP. Call this after a successful admin action.
 */
export function resetAttempts(ip: string): void {
  attempts.delete(ip);
}

/**
 * Get the client IP from a NextRequest. Falls back to "unknown" if none found.
 */
export function getClientIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xri = request.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return "unknown";
}
