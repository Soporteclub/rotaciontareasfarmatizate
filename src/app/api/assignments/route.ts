// Assignments API Route
// GET /api/assignments - List assignments (for calendar)
// POST /api/assignments/generate - Generate fair assignments

import { NextRequest, NextResponse } from "next/server";
import { assignmentService } from "@/backend/application/services/assignment-service";
import { generateAssignmentsSchema } from "@/backend/application/validators/schemas";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const groupId = searchParams.get("groupId") ?? undefined;
    const startStr = searchParams.get("startDate");
    const endStr = searchParams.get("endDate");

    const startDate = startStr ? new Date(startStr) : undefined;
    let endDate: Date | undefined;
    if (endStr) {
      const end = new Date(endStr);
      end.setUTCHours(23, 59, 59, 999);
      endDate = end;
    }

    if (groupId && startDate && endDate) {
      const assignments = await assignmentService.getByGroupAndDateRange(groupId, startDate, endDate);
      return NextResponse.json({ data: assignments });
    }

    const assignments = await assignmentService.getAllForCalendar(startDate, endDate);
    return NextResponse.json({ data: assignments });
  } catch (error) {
    console.error("[assignments/get]", error);
    return NextResponse.json({ error: "Error al obtener asignaciones" }, { status: 500 });
  }
}
