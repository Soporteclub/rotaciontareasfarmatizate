// Delete Assignments API Route
// POST /api/assignments/delete - Delete all assignments for a group

import { NextRequest, NextResponse } from "next/server";
import { assignmentService } from "@/backend/application/services/assignment-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { groupId } = body;

    if (!groupId) {
      return NextResponse.json(
        { error: "groupId es requerido" },
        { status: 400 }
      );
    }

    const result = await assignmentService.deleteAllByGroup(groupId);

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
