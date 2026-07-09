// Reset API Route - Clear all data and re-seed
// POST /api/reset
// Header: x-admin-key: <admin key>
//
// FIX (API-02): Now requires admin key.
// FIX (API-02): Wrapped in a transaction so a mid-way failure rolls back.
// FIX (SEC-04): Admin key validated with constant-time comparison.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/infrastructure/database";
import { validateAdminKey } from "@/backend/infrastructure/admin-guard";

export async function POST(request: NextRequest) {
  // Authorize via header
  const adminKey = request.headers.get("x-admin-key") || request.nextUrl.searchParams.get("adminKey") || "";
  const authorized = await validateAdminKey(adminKey);
  if (!authorized) {
    return NextResponse.json(
      { error: "Se requiere clave de administrador valida (header x-admin-key o query adminKey)" },
      { status: adminKey ? 403 : 401 }
    );
  }

  try {
    // Transactional: if anything fails, the DB is left untouched.
    await db.$transaction([
      db.auditLog.deleteMany(),
      db.assignment.deleteMany(),
      db.taskEligibility.deleteMany(),
      db.rule.deleteMany(),
      db.employee.deleteMany(),
      db.group.deleteMany(),
      db.holiday.deleteMany(),
      db.settings.deleteMany(),
    ]);

    return NextResponse.json({ data: { message: "Base de datos reiniciada exitosamente" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al reiniciar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
