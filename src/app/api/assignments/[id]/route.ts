// Update Assignment API Route
// PATCH /api/assignments/[id] - Update an assignment (change employee) only if not locked

import { NextRequest, NextResponse } from "next/server";
import { assignmentRepository } from "@/backend/infrastructure/repositories/assignment-repository";
import { auditLogRepository } from "@/backend/infrastructure/repositories/audit-log-repository";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { employeeId } = body;

    if (!employeeId || typeof employeeId !== "string") {
      return NextResponse.json(
        { error: "employeeId es requerido" },
        { status: 400 }
      );
    }

    // Find the existing assignment
    const existing = await assignmentRepository.findById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "Asignación no encontrada" },
        { status: 404 }
      );
    }

    // Check if locked (past assignment)
    if (existing.isLocked) {
      return NextResponse.json(
        { error: "No se puede editar una asignación bloqueada (histórica)" },
        { status: 403 }
      );
    }

    // Update the assignment
    const updated = await assignmentRepository.updateEmployee(id, employeeId);

    // Audit log
    await auditLogRepository.create({
      entityType: "assignment",
      entityId: id,
      action: "edit",
      changes: {
        previousEmployeeId: existing.employeeId,
        previousEmployeeName: existing.employee?.name,
        newEmployeeId: employeeId,
        newEmployeeName: updated.employee?.name,
        date: existing.date,
        taskName: existing.taskName,
        groupId: existing.groupId,
      },
      groupId: existing.groupId,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar asignación";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
