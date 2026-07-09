// Admin Verification API Route
// POST /api/admin/verify - Verify admin key
//
// FIX (API-01): Previously validated against a hardcoded fallback "farmatizate2026"
// while the rest of the backend validated against the DB key ("farmatizate2025").
// Now there is a SINGLE source of truth: settingsService.validateKey (DB).
// FIX (SEC-04): Uses constant-time comparison via settingsService.

import { NextRequest, NextResponse } from "next/server";
import { settingsService } from "@/backend/application/services/settings-service";

export async function POST(request: NextRequest) {
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
      // System not initialized yet — be honest but don't leak details
      return NextResponse.json(
        { data: { valid: false, error: "El sistema no está configurado" } },
        { status: 503 }
      );
    }

    // Delegate to settingsService which uses constant-time comparison
    const valid = await settingsService.validateKey(key);

    if (!valid) {
      return NextResponse.json(
        { data: { valid: false, error: "Clave incorrecta" } },
        { status: 401 }
      );
    }

    return NextResponse.json({
      data: { valid: true },
    });
  } catch {
    return NextResponse.json(
      { data: { valid: false, error: "Error al verificar" } },
      { status: 500 }
    );
  }
}
