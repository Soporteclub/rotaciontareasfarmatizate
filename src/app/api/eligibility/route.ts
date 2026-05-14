// Task Eligibility API Route
// GET /api/eligibility?employeeId=xxx - Get task eligibility for employee
// POST /api/eligibility - Toggle task eligibility (syncs with assignments)

import { NextRequest, NextResponse } from "next/server";
import { taskEligibilityService } from "@/backend/application/services/task-eligibility-service";

export async function GET(request: NextRequest) {
  try {
    const employeeId = request.nextUrl.searchParams.get("employeeId");
    if (!employeeId) {
      return NextResponse.json({ error: "employeeId es requerido" }, { status: 400 });
    }
    const eligibility = await taskEligibilityService.getByEmployee(employeeId);
    return NextResponse.json({ data: eligibility });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener elegibilidad";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
    const message = error instanceof Error ? error.message : "Error al actualizar elegibilidad";
    const status = message.includes("no encontrado") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
