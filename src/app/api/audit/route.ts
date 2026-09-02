// Audit Log API Route
// GET /api/audit - Query audit logs
// Header: x-admin-key: <admin key>
//
// FIX (API-15): Now requires admin key. Audit logs contain PII (employee names,
//               before/after diffs) and must not be publicly readable.

import { NextRequest, NextResponse } from "next/server";
import { auditService } from "@/backend/application/services/audit-service";
import { auditQuerySchema } from "@/backend/application/validators/schemas";
import { validateAdminKey } from "@/backend/infrastructure/admin-guard";

export async function GET(request: NextRequest) {
  // FIX (API-15): require admin key — audit logs contain PII
  const adminKey = request.headers.get("x-admin-key") || "";
  const authorized = await validateAdminKey(adminKey);
  if (!authorized) {
    return NextResponse.json(
      { error: "Se requiere clave de administrador valida (header x-admin-key)" },
      { status: adminKey ? 403 : 401 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const input = {
      entityType: searchParams.get("entityType") ?? undefined,
      entityId: searchParams.get("entityId") ?? undefined,
      groupId: searchParams.get("groupId") ?? undefined,
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50,
      offset: searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0,
    };

    const parsed = auditQuerySchema.safeParse(input);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Parametros invalidos", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await auditService.query(parsed.data);
    return NextResponse.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener logs de auditoria";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
