// Settings API Route
// GET /api/settings - Get app settings (no key info exposed)
// POST /api/settings - Validate admin key
// PUT /api/settings/key - Change admin key (requires currentKey + newKey)
//
// FIX (API-20, SEC-04): GET no longer exposes keyHint (first 2 chars of admin key).

import { NextRequest, NextResponse } from "next/server";
import { settingsService } from "@/backend/application/services/settings-service";
import { getClientIp, isRateLimited, recordFailedAttempt, resetAttempts } from "@/backend/infrastructure/rate-limiter";

export async function GET() {
  try {
    const settings = await settingsService.getSettings();
    return NextResponse.json({
      data: {
        isConfigured: !!settings,
        createdAt: settings?.createdAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener configuracion";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // FIX (SEC-05): rate-limit per IP to prevent brute-force attacks
  const ip = getClientIp(request);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Intenta de nuevo en 15 minutos." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { key } = body;

    if (!key) {
      return NextResponse.json({ error: "Clave requerida" }, { status: 400 });
    }

    const isValid = await settingsService.validateKey(key);
    if (!isValid) {
      recordFailedAttempt(ip);
    } else {
      resetAttempts(ip);
    }
    return NextResponse.json({ data: { valid: isValid } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al validar clave";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  // FIX (SEC-05): rate-limit per IP
  const ip = getClientIp(request);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Intenta de nuevo en 15 minutos." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { currentKey, newKey } = body;

    if (!currentKey || !newKey) {
      return NextResponse.json({ error: "Clave actual y nueva clave requeridas" }, { status: 400 });
    }

    await settingsService.updateKey(currentKey, newKey);
    resetAttempts(ip);
    return NextResponse.json({ data: { message: "Clave actualizada exitosamente" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar clave";
    const status = message.includes("incorrecta") ? 401 : message.includes("al menos") ? 400 : 500;
    if (status === 401) recordFailedAttempt(ip);
    return NextResponse.json({ error: message }, { status });
  }
}
