// Groups API Route - Controller layer (thin, delegates to service)
// GET /api/groups - List all groups
// POST /api/groups - Create a group

import { NextRequest, NextResponse } from "next/server";
import { groupService } from "@/backend/application/services/group-service";
import { createGroupSchema } from "@/backend/application/validators/schemas";
import { validateAdminKey } from "@/backend/infrastructure/admin-guard";

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
  // FIX: require admin key to create groups
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
