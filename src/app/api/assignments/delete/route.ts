// Delete Assignments API Route
// POST /api/assignments/delete - Delete assignments for a group
// Body: { groupId: string, startDate?: string, endDate?: string }
// - Without dates: deletes ALL assignments for the group
// - With dates: deletes assignments within the date range (including locked)

import { NextRequest, NextResponse } from "next/server";
import { assignmentService } from "@/backend/application/services/assignment-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { groupId, startDate, endDate } = body;

    if (!groupId) {
      return NextResponse.json(
        { error: "groupId es requerido" },
        { status: 400 }
      );
    }

    let result;

    if (startDate && endDate) {
      // Delete by group + date range (includes locked)
      result = await assignmentService.deleteByGroupAndDateRange(groupId, startDate, endDate);
    } else {
      // Delete all assignments for the group
      result = await assignmentService.deleteAllByGroup(groupId);
    }

    return NextResponse.json({
      data: {
        deletedCount: result.deletedCount,
        message: `Se eliminaron ${result.deletedCount} asignaciones`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al eliminar asignaciones";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
