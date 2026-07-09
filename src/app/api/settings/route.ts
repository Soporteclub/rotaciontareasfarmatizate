// Settings API Route
// GET /api/settings - Get app settings (no key info exposed)
// POST /api/settings - Validate admin key
// PUT /api/settings/key - Change admin key (requires currentKey + newKey)
//
// FIX (API-20, SEC-04): GET no longer exposes keyHint (first 2 chars of admin key).

import { NextRequest, NextResponse } from "next/server";
import { settingsService } from "@/backend/application/services/settings-service";

export async function GET() {
  try {
    const settings = await settingsService.getSettings();
    // FIX (API-20, SEC-04): Do NOT expose any portion of the admin key.
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
  try {
    const body = await request.json();
    const { key } = body;

    if (!key) {
      return NextResponse.json({ error: "Clave requerida" }, { status: 400 });
    }

    const isValid = await settingsService.validateKey(key);
    return NextResponse.json({ data: { valid: isValid } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al validar clave";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentKey, newKey } = body;

    if (!currentKey || !newKey) {
      return NextResponse.json({ error: "Clave actual y nueva clave requeridas" }, { status: 400 });
    }

    await settingsService.updateKey(currentKey, newKey);
    return NextResponse.json({ data: { message: "Clave actualizada exitosamente" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar clave";
    const status = message.includes("incorrecta") ? 401 : message.includes("al menos") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
