// Admin Verification API Route
// POST /api/admin/verify - Verify admin key

import { NextRequest, NextResponse } from "next/server";

// Admin key - in production this would be hashed and stored securely
// For now using env variable with fallback
const ADMIN_KEY = process.env.ADMIN_KEY || "***REMOVED***";

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

    const valid = key === ADMIN_KEY;

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
