// Task Eligibility Group API Route
// GET /api/task-eligibility?groupId=xxx - Get task eligibility for all employees in a group
// Returns a matrix of employees × tasks with their eligibility status

import { NextRequest, NextResponse } from "next/server";
import { employeeTaskEligibilityService } from "@/backend/application/services/employee-task-eligibility-service";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const groupId = searchParams.get("groupId");

    if (!groupId) {
      return NextResponse.json(
        { error: "El parámetro groupId es requerido" },
        { status: 400 }
      );
    }

    const result = await employeeTaskEligibilityService.getByGroup(groupId);
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("[task-eligibility/get]", error);
    return NextResponse.json({ error: "Error al obtener elegibilidad de tareas" }, { status: 500 });
  }
}
