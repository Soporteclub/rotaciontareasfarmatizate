// Rules API Route
// GET /api/rules - List rules
// POST /api/rules - Create rule

import { NextRequest, NextResponse } from "next/server";
import { ruleService } from "@/application/services/rule-service";
import { createRuleSchema } from "@/application/validators/schemas";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const groupId = searchParams.get("groupId") ?? undefined;
    const includeInactive = searchParams.get("includeInactive") === "true";

    const rules = await ruleService.getAll(groupId, includeInactive);
    return NextResponse.json({ data: rules });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener reglas";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
    const message = error instanceof Error ? error.message : "Error al crear regla";
    const status = message.includes("ya existe") || message.includes("no existe") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
