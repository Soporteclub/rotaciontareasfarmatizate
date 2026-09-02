// Settings Service - Business logic for application settings
// Manages admin key validation and settings configuration.
//
// FIX (SEC-03): the admin key is stored as a scrypt hash (salt:hash in hex),
// never in plaintext. validateKey hashes the input and compares in constant time.
// Migration: existing plaintext keys are auto-hashed on first successful validation.
//
// FIX (SEC-04): constant-time comparison (timingSafeEqual) to prevent timing attacks.

import { db } from "@/backend/infrastructure/database";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;
const SCRYPT_COST = 16384;

/** Constant-time string comparison. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/** Hash a plaintext key with a fresh random salt. Returns "salt:hash" (hex). */
async function hashKey(key: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(key, salt, KEY_LENGTH, { N: SCRYPT_COST });
  return `${salt}:${derived.toString("hex")}`;
}

/** Verify a plaintext key against a stored "salt:hash" string. */
async function verifyKey(key: string, stored: string): Promise<boolean> {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;
  const derived = scryptSync(key, salt, KEY_LENGTH, { N: SCRYPT_COST });
  const storedBuf = Buffer.from(hashHex, "hex");
  if (storedBuf.length !== derived.length) return false;
  return timingSafeEqual(derived, storedBuf);
}

/** True if the stored value looks like a scrypt hash (contains a colon). */
function isHashed(stored: string): boolean {
  return stored.includes(":");
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
   * If the stored key is still plaintext (legacy), hashes it on first success
   * so the DB migrates itself to hashed storage.
   */
  async validateKey(key: string): Promise<boolean> {
    const settings = await db.settings.findUnique({
      where: { id: "app" },
    });
    if (!settings) return false;

    if (isHashed(settings.key)) {
      return verifyKey(key, settings.key);
    }

    // Legacy plaintext key — compare and auto-migrate to hash
    if (!safeEqual(key, settings.key)) return false;
    const hashed = await hashKey(key);
    await db.settings.update({
      where: { id: "app" },
      data: { key: hashed, value: hashed },
    });
    return true;
  },

  /**
   * Updates the admin key. Requires the current key to match.
   * Enforces a minimum length of 8 characters.
   */
  async updateKey(currentKey: string, newKey: string) {
    const settings = await db.settings.findUnique({
      where: { id: "app" },
    });
    if (!settings) throw new Error("Configuración no encontrada");

    // Verify current key (handles both plaintext and hashed)
    let currentValid: boolean;
    if (isHashed(settings.key)) {
      currentValid = await verifyKey(currentKey, settings.key);
    } else {
      currentValid = safeEqual(currentKey, settings.key);
    }
    if (!currentValid) throw new Error("Clave actual incorrecta");

    if (!newKey || newKey.length < 8) {
      throw new Error("La nueva clave debe tener al menos 8 caracteres");
    }

    const hashed = await hashKey(newKey);
    return db.settings.update({
      where: { id: "app" },
      data: { key: hashed, value: hashed },
    });
  },

  /**
   * Helper for seed/restore: store a freshly generated key as a hash.
   */
  async storeHashedKey(key: string) {
    const hashed = await hashKey(key);
    return db.settings.upsert({
      where: { id: "app" },
      update: { key: hashed, value: hashed },
      create: { id: "app", key: hashed, value: hashed },
    });
  },
};
