// Groups API Route - Controller layer (thin, delegates to service)
// GET /api/groups - List all groups
// POST /api/groups - Create a group

import { NextRequest, NextResponse } from "next/server";
import { groupService } from "@/backend/application/services/group-service";
import { createGroupSchema } from "@/backend/application/validators/schemas";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const includeInactive = searchParams.get("includeInactive") === "true";

    const groups = await groupService.getAll(includeInactive);
    return NextResponse.json({ data: groups });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener grupos";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createGroupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const group = await groupService.create(parsed.data);
    return NextResponse.json({ data: group }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al crear grupo";
    const status = message.includes("ya existe") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
