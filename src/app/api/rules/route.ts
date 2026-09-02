// Rules API Route
// GET /api/rules - List rules
// POST /api/rules - Create rule

import { NextRequest, NextResponse } from "next/server";
import { ruleService } from "@/backend/application/services/rule-service";
import { createRuleSchema } from "@/backend/application/validators/schemas";
import { validateAdminKey } from "@/backend/infrastructure/admin-guard";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const groupId = searchParams.get("groupId") ?? undefined;
    const includeInactive = searchParams.get("includeInactive") === "true";

    const rules = await ruleService.getAll(groupId, includeInactive);
    return NextResponse.json({ data: rules });
  } catch (error) {
    console.error("[rules/get]", error);
    return NextResponse.json({ error: "Error al obtener reglas" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // FIX: require admin key to create rules
  const adminKey = request.headers.get("x-admin-key") || "";
  const authorized = await validateAdminKey(adminKey);
  if (!authorized) {
    return NextResponse.json(
      { error: "Se requiere clave de administrador válida (header x-admin-key)" },
      { status: adminKey ? 403 : 401 }
    );
  }

  try {
    const body = await request.json();
    const parsed = createRuleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const rule = await ruleService.create(parsed.data);
    return NextResponse.json({ data: rule }, { status: 201 });
  } catch (error) {
    console.error("[rules/create]", error);
    return NextResponse.json({ error: "Error al crear regla" }, { status: 500 });
  }
}
