// Employees [id] API Route
// FIX (API-13): DELETE now requires admin key (header x-admin-key).

import { NextRequest, NextResponse } from "next/server";
import { employeeService } from "@/backend/application/services/employee-service";
import { updateEmployeeSchema } from "@/backend/application/validators/schemas";
import { validateAdminKey } from "@/backend/infrastructure/admin-guard";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const employee = await employeeService.getById(id);
    return NextResponse.json({ data: employee });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener empleado";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateEmployeeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const employee = await employeeService.update(id, parsed.data);
    return NextResponse.json({ data: employee });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar empleado";
    return NextResponse.json({ error: message }, { status: 500 });
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
    const employee = await employeeService.softDelete(id);
    return NextResponse.json({ data: employee });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al eliminar empleado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
