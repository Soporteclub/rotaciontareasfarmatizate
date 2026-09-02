// Reset API Route - Clear all data and re-seed
// POST /api/reset
// Header: x-admin-key: <admin key>
//
// FIX (API-02): Now requires admin key.
// FIX (API-02): Wrapped in a transaction so a mid-way failure rolls back.
// FIX (SEC-04): Admin key validated with constant-time comparison.
// FIX (AUDIT-01): Creates audit log BEFORE deletion and preserves audit logs
// so there's always a trace of who performed the destructive operation.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/infrastructure/database";
import { validateAdminKey } from "@/backend/infrastructure/admin-guard";

export async function POST(request: NextRequest) {
  // Authorize via header
  const adminKey = request.headers.get("x-admin-key") || "";
  const authorized = await validateAdminKey(adminKey);
  if (!authorized) {
    return NextResponse.json(
      { error: "Se requiere clave de administrador valida (header x-admin-key)" },
      { status: adminKey ? 403 : 401 }
    );
  }

  try {
    // FIX (AUDIT-01): Create audit log BEFORE deletion so the trace survives.
    await db.auditLog.create({
      data: {
        entityType: "assignment",
        entityId: "batch",
        action: "reset",
        changedBy: "admin",
        changes: JSON.stringify({ message: "Full database reset executed", adminKeyPrefix: adminKey.slice(0, 8) }),
      },
    });

    // Transactional: if anything fails, the DB is left untouched.
    // FIX (AUDIT-01): Delete all tables EXCEPT auditLog to preserve the audit trail.
    await db.$transaction([
      db.assignment.deleteMany(),
      db.taskEligibility.deleteMany(),
      db.rule.deleteMany(),
      db.employee.deleteMany(),
      db.group.deleteMany(),
      db.holiday.deleteMany(),
      db.settings.deleteMany(),
    ]);

    console.log(`[reset] Admin executed reset at ${new Date().toISOString()}`);

    return NextResponse.json({ data: { message: "Base de datos reiniciada exitosamente" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al reiniciar";
    console.error("[reset] Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
