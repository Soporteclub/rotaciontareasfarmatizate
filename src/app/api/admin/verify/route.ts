// Admin Verification API Route
// POST /api/admin/verify - Verify admin key
//
// FIX (API-01): Previously validated against a hardcoded fallback "farmatizate2026"
// while the rest of the backend validated against the DB key ("farmatizate2025").
// Now there is a SINGLE source of truth: settingsService.validateKey (DB).
// FIX (SEC-04): Uses constant-time comparison via settingsService.

import { NextRequest, NextResponse } from "next/server";
import { settingsService } from "@/backend/application/services/settings-service";
import { getClientIp, isRateLimited, recordFailedAttempt, resetAttempts } from "@/backend/infrastructure/rate-limiter";

export async function POST(request: NextRequest) {
  // FIX (SEC-05): rate-limit per IP to prevent brute-force attacks against the admin key
  const ip = getClientIp(request);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { data: { valid: false, error: "Demasiados intentos. Intenta de nuevo en 15 minutos." } },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { key } = body;

    if (!key || typeof key !== "string") {
      return NextResponse.json(
        { data: { valid: false, error: "Clave requerida" } },
        { status: 400 }
      );
    }

    const settings = await settingsService.getSettings();
    if (!settings) {
      return NextResponse.json(
        { data: { valid: false, error: "El sistema no está configurado" } },
        { status: 503 }
      );
    }

    const valid = await settingsService.validateKey(key);

    if (!valid) {
      recordFailedAttempt(ip);
      return NextResponse.json(
        { data: { valid: false, error: "Clave incorrecta" } },
        { status: 401 }
      );
    }

    resetAttempts(ip);
    return NextResponse.json({ data: { valid: true } });
  } catch {
    return NextResponse.json(
      { data: { valid: false, error: "Error al verificar" } },
      { status: 400 }
    );
  }
}
