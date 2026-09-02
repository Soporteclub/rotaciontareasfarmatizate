// Rules [id] API Route
// FIX (API-13): DELETE now requires admin key (header x-admin-key).
//               permanent=true hard delete also requires admin key.

import { NextRequest, NextResponse } from "next/server";
import { ruleService } from "@/backend/application/services/rule-service";
import { updateRuleSchema } from "@/backend/application/validators/schemas";
import { validateAdminKey } from "@/backend/infrastructure/admin-guard";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rule = await ruleService.getById(id);
    return NextResponse.json({ data: rule });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener regla";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // FIX: require admin key to update rules
  const adminKey = request.headers.get("x-admin-key") || "";
  const authorized = await validateAdminKey(adminKey);
  if (!authorized) {
    return NextResponse.json(
      { error: "Se requiere clave de administrador válida (header x-admin-key)" },
      { status: adminKey ? 403 : 401 }
    );
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateRuleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const rule = await ruleService.update(id, parsed.data);
    return NextResponse.json({ data: rule });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar regla";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // FIX (API-13): require admin key for both soft and hard delete
  const adminKey = request.headers.get("x-admin-key") || "";
  const authorized = await validateAdminKey(adminKey);
  if (!authorized) {
    return NextResponse.json(
      { error: "Se requiere clave de administrador valida (header x-admin-key)" },
      { status: adminKey ? 403 : 401 }
    );
  }

  try {
    const { id } = await params;
    const permanent = request.nextUrl.searchParams.get("permanent") === "true";

    if (permanent) {
      const result = await ruleService.hardDelete(id);
      return NextResponse.json({ data: result });
    }

    const rule = await ruleService.softDelete(id);
    return NextResponse.json({ data: rule });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al eliminar regla";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
