// Settings Service - Business logic for application settings
// Manages admin key validation and settings configuration
//
// FIX (SEC-04): validateKey now uses constant-time comparison (timingSafeEqual)
// to prevent timing attacks. updateKey enforces minimum length of 8 chars.

import { db } from "@/backend/infrastructure/database";
import { timingSafeEqual } from "crypto";

/** Constant-time string comparison. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  if (bufA.length !== bufB.length) {
    // Keep constant time by comparing against itself, then return false
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export const settingsService = {
  async getSettings() {
    const settings = await db.settings.findUnique({
      where: { id: "app" },
    });
    return settings;
  },

  /**
   * Validates an admin key against the one stored in the DB.
   * Uses constant-time comparison to prevent timing attacks.
   */
  async validateKey(key: string): Promise<boolean> {
    const settings = await db.settings.findUnique({
      where: { id: "app" },
    });

    if (!settings) {
      return false;
    }

    return safeEqual(key, settings.key);
  },

  /**
   * Updates the admin key. Requires the current key to match.
   * Enforces a minimum length of 8 characters.
   */
  async updateKey(currentKey: string, newKey: string) {
    const settings = await db.settings.findUnique({
      where: { id: "app" },
    });

    if (!settings) {
      throw new Error("Configuración no encontrada");
    }

    // Validate the current key with constant-time comparison
    if (!safeEqual(currentKey, settings.key)) {
      throw new Error("Clave actual incorrecta");
    }

    if (!newKey || newKey.length < 8) {
      throw new Error("La nueva clave debe tener al menos 8 caracteres");
    }

    const updated = await db.settings.update({
      where: { id: "app" },
      data: { key: newKey, value: newKey },
    });

    return updated;
  },
};
