// Task Eligibility API Route
// GET /api/eligibility?employeeId=xxx - Get task eligibility for employee
// POST /api/eligibility - Toggle task eligibility (syncs with assignments)

import { NextRequest, NextResponse } from "next/server";
import { taskEligibilityService } from "@/backend/application/services/task-eligibility-service";
import { validateAdminKey } from "@/backend/infrastructure/admin-guard";

export async function GET(request: NextRequest) {
  try {
    const employeeId = request.nextUrl.searchParams.get("employeeId");
    if (!employeeId) {
      return NextResponse.json({ error: "employeeId es requerido" }, { status: 400 });
    }
    const eligibility = await taskEligibilityService.getByEmployee(employeeId);
    return NextResponse.json({ data: eligibility });
  } catch (error) {
    console.error("[eligibility/get]", error);
    return NextResponse.json({ error: "Error al obtener elegibilidad" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // FIX: require admin key to toggle eligibility (triggers assignment sync)
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
    const { employeeId, taskName, isEnabled } = body;

    if (!employeeId || !taskName || typeof isEnabled !== "boolean") {
      return NextResponse.json(
        { error: "employeeId, taskName e isEnabled son requeridos" },
        { status: 400 }
      );
    }

    const result = await taskEligibilityService.toggle(employeeId, taskName, isEnabled);

    return NextResponse.json({
      data: {
        ...result.eligibility,
        deletedAssignments: result.deletedAssignments,
      },
    });
  } catch (error) {
    console.error("[eligibility/toggle]", error);
    return NextResponse.json({ error: "Error al actualizar elegibilidad" }, { status: 500 });
  }
}
