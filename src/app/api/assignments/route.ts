// Assignments API Route
// GET /api/assignments - List assignments (for calendar)
// POST /api/assignments/generate - Generate fair assignments

import { NextRequest, NextResponse } from "next/server";
import { assignmentService } from "@/application/services/assignment-service";
import { generateAssignmentsSchema } from "@/application/validators/schemas";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const groupId = searchParams.get("groupId") ?? undefined;
    const startStr = searchParams.get("startDate");
    const endStr = searchParams.get("endDate");

    const startDate = startStr ? new Date(startStr) : undefined;
    const endDate = endStr ? new Date(endStr) : undefined;

    if (groupId && startDate && endDate) {
      const assignments = await assignmentService.getByGroupAndDateRange(groupId, startDate, endDate);
      return NextResponse.json({ data: assignments });
    }

    const assignments = await assignmentService.getAllForCalendar(startDate, endDate);
    return NextResponse.json({ data: assignments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener asignaciones";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
