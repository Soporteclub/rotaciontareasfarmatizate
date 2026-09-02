// Holiday API Route - Single holiday operations
// PATCH /api/holidays/[id] - Update a holiday
// DELETE /api/holidays/[id] - Delete a holiday

import { NextRequest, NextResponse } from "next/server";
import { holidayService } from "@/backend/application/services";
import { validateAdminKey } from "@/backend/infrastructure/admin-guard";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // FIX: require admin key to update holidays
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

    const updated = await holidayService.update(id, body);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[holidays/update]", error);
    return NextResponse.json({ error: "Error al actualizar festivo" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // FIX: require admin key to delete holidays
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

    await holidayService.delete(id);
    return NextResponse.json({ message: "Festivo eliminado" });
  } catch (error) {
    console.error("[holidays/delete]", error);
    return NextResponse.json({ error: "Error al eliminar festivo" }, { status: 500 });
  }
}
