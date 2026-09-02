// Groups [id] API Route - CRUD for single group
// FIX (API-13): DELETE now requires admin key (header x-admin-key).

import { NextRequest, NextResponse } from "next/server";
import { groupService } from "@/backend/application/services/group-service";
import { updateGroupSchema } from "@/backend/application/validators/schemas";
import { validateAdminKey } from "@/backend/infrastructure/admin-guard";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const group = await groupService.getById(id);
    return NextResponse.json({ data: group });
  } catch (error) {
    console.error("[groups/get]", error);
    return NextResponse.json({ error: "Grupo no encontrado" }, { status: 404 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // FIX: require admin key to update groups
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
    const parsed = updateGroupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const group = await groupService.update(id, parsed.data);
    return NextResponse.json({ data: group });
  } catch (error) {
    console.error("[groups/update]", error);
    return NextResponse.json({ error: "Error al actualizar grupo" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // FIX (API-13): require admin key
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
    const group = await groupService.softDelete(id);
    return NextResponse.json({ data: group });
  } catch (error) {
    console.error("[groups/delete]", error);
    return NextResponse.json({ error: "Error al eliminar grupo" }, { status: 500 });
  }
}
