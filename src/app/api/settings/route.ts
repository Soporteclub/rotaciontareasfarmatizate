// Settings API Route
// GET /api/settings - Get app settings (key is masked)
// POST /api/settings/validate - Validate admin key
// PUT /api/settings/key - Change admin key

import { NextRequest, NextResponse } from "next/server";
import { settingsService } from "@/backend/application/services/settings-service";

export async function GET() {
  try {
    const settings = await settingsService.getSettings();
    // Never expose the full key, only hint
    return NextResponse.json({
      data: {
        isConfigured: !!settings,
        keyHint: settings ? settings.key.slice(0, 2) + "••••" : null,
        createdAt: settings?.createdAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener configuración";
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

    const settings = await settingsService.updateKey(currentKey, newKey);
    return NextResponse.json({ data: { message: "Clave actualizada exitosamente" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar clave";
    const status = message.includes("incorrecta") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
