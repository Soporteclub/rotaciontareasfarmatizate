// Employee Task Eligibility API Route
// GET /api/employees/[id]/task-eligibility - Get task eligibility for an employee
// PUT /api/employees/[id]/task-eligibility - Update task eligibility for an employee
// PATCH /api/employees/[id]/task-eligibility - Toggle a single task eligibility

import { NextRequest, NextResponse } from "next/server";
import { employeeTaskEligibilityService } from "@/backend/application/services/employee-task-eligibility-service";
import { validateAdminKey } from "@/backend/infrastructure/admin-guard";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await employeeTaskEligibilityService.getByEmployee(id);
    return NextResponse.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener elegibilidad de tareas";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // FIX: require admin key to update task eligibility
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
    const { settings } = body as { settings: Array<{ taskLabel: string; isActive: boolean }> };

    if (!Array.isArray(settings)) {
      return NextResponse.json(
        { error: "settings debe ser un arreglo de { taskLabel, isActive }" },
        { status: 400 }
      );
    }

    const result = await employeeTaskEligibilityService.update(id, settings);
    return NextResponse.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar elegibilidad de tareas";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // FIX: require admin key to toggle task eligibility
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
    const { taskLabel, isActive } = body as { taskLabel: string; isActive: boolean };

    if (!taskLabel || typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "Se requiere taskLabel (string) e isActive (boolean)" },
        { status: 400 }
      );
    }

    const result = await employeeTaskEligibilityService.toggle(id, taskLabel, isActive);
    return NextResponse.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar elegibilidad de tarea";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
