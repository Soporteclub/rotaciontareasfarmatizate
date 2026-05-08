// Audit Log API Route
// GET /api/audit - Query audit logs

import { NextRequest, NextResponse } from "next/server";
import { auditService } from "@/backend/application/services/audit-service";
import { auditQuerySchema } from "@/backend/application/validators/schemas";

export async function GET(request: NextRequest) {
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
        { error: "Parámetros inválidos", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await auditService.query(parsed.data);
    return NextResponse.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener logs de auditoría";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
