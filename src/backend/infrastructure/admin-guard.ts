// Admin Guard - Server-side helpers for protecting destructive API routes
// Fixes: API-01, API-02, API-04, API-05, API-06, API-13, API-15, SEC-04
//
// Single source of truth for admin key validation.
// All routes that mutate data MUST use requireAdmin().

import { NextRequest, NextResponse } from "next/server";
import { settingsService } from "@/backend/application/services/settings-service";
import { timingSafeEqual } from "crypto";

/**
 * Constant-time string comparison to prevent timing attacks (SEC-04).
 * Returns true if both strings are byte-equal, false otherwise.
 */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  if (bufA.length !== bufB.length) {
    // Compare bufA against itself to keep constant time, then return false
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export interface AdminContext {
  adminKey: string;
}

/**
 * Extracts the admin key from a request. Looks in, in order:
 *   1. The `x-admin-key` header (useful for GET/DELETE that have no body)
 *   2. The `adminKey` query parameter
 *   3. The `adminKey` field of a JSON body
 *
 * NOTE: If the key is in the JSON body, this consumes request.json().
 * For routes where the body is needed afterwards, prefer header or query param.
 */
async function extractAdminKey(request: NextRequest): Promise<string> {
  // 1. Header
  const headerKey = request.headers.get("x-admin-key");
  if (headerKey) return headerKey;

  // 2. Query param
  const queryKey = request.nextUrl.searchParams.get("adminKey");
  if (queryKey) return queryKey;

  // 3. JSON body (best-effort; ignore parse errors)
  try {
    const body = await request.json();
    if (body && typeof body === "object" && "adminKey" in body) {
      return String((body as Record<string, unknown>).adminKey);
    }
  } catch {
    // Body wasn't JSON or was empty — that's fine, we'll return "" below
  }

  return "";
}

/**
 * Validates the admin key sent in the request against the one stored in DB.
 * Returns the admin context if valid, or a NextResponse (error) if not.
 *
 * Usage:
 *   const adminOrError = await requireAdmin(request);
 *   if (adminOrError instanceof NextResponse) return adminOrError;
 *   // ... proceed with adminOrError.adminKey
 *
 * NOTE: This consumes the request body if the key is sent there. For routes
 * that need to read the body afterwards, send the key via `x-admin-key` header
 * or `?adminKey=...` query param.
 */
export async function requireAdmin(
  request: NextRequest
): Promise<AdminContext | NextResponse> {
  const adminKey = await extractAdminKey(request);

  if (!adminKey) {
    return NextResponse.json(
      { error: "Se requiere la clave de administrador (header x-admin-key, query adminKey, o body adminKey)" },
      { status: 401 }
    );
  }

  // Look up the stored key (single source of truth: DB via settingsService)
  const settings = await settingsService.getSettings();
  if (!settings) {
    return NextResponse.json(
      { error: "El sistema no está configurado. Ejecuta /api/seed primero." },
      { status: 503 }
    );
  }

  // Constant-time comparison against the stored key
  if (!safeEqual(adminKey, settings.key)) {
    return NextResponse.json(
      { error: "Clave de administrador incorrecta" },
      { status: 403 }
    );
  }

  return { adminKey };
}

/**
 * Validates an admin key provided as a plain string (e.g. in query params or
 * a separate body field). Useful for routes where the body is already
 * consumed for another purpose, or where the admin key comes in a dedicated
 * header/field.
 */
export async function validateAdminKey(adminKey: string): Promise<boolean> {
  if (!adminKey) return false;
  const settings = await settingsService.getSettings();
  if (!settings) return false;
  return safeEqual(adminKey, settings.key);
}
