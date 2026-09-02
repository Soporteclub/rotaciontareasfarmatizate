// Settings Repository - Database access for app configuration
//
// FIX (API-07, SEC-04): No more hardcoded default "farmatizate2025".
// The default key is now a random 32-char hex generated at init time.
// validateKey uses constant-time comparison.

import { db } from "@/backend/infrastructure/database";
import { randomBytes, timingSafeEqual } from "crypto";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export const settingsRepository = {
  async get() {
    return db.settings.findUnique({ where: { id: "app" } });
  },

  /**
   * Initializes the settings row if it doesn't exist.
   * Generates a random 32-char admin key if none is provided.
   * Never overwrites an existing row.
   */
  async initialize(key?: string) {
    const finalKey = key || randomBytes(16).toString("hex"); // 32 chars
    return db.settings.upsert({
      where: { id: "app" },
      update: {},
      create: { id: "app", key: finalKey },
    });
  },

  async updateKey(newKey: string) {
    return db.settings.upsert({
      where: { id: "app" },
      update: { key: newKey },
      create: { id: "app", key: newKey },
    });
  },

  /** Constant-time key validation. */
  async validateKey(inputKey: string): Promise<boolean> {
    const settings = await db.settings.findUnique({ where: { id: "app" } });
    if (!settings) return false;
    return safeEqual(inputKey, settings.key);
  },
};
