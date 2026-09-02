// Update Assignment API Route
// PATCH /api/assignments/[id] - Update an assignment (change employee) only if not locked
// Requires admin key verification via settings service
// Body: { employeeId: string, adminKey: string, force?: boolean }
// - force=true allows editing past assignments (emergency override), requires admin key

import { NextRequest, NextResponse } from "next/server";
import { assignmentRepository } from "@/backend/infrastructure/repositories/assignment-repository";
import { employeeRepository } from "@/backend/infrastructure/repositories/employee-repository";
import { auditLogRepository } from "@/backend/infrastructure/repositories/audit-log-repository";
import { settingsService } from "@/backend/application/services/settings-service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { employeeId, adminKey, force } = body;

    // Verify admin key via settings service (same as sidebar unlock)
    if (!adminKey) {
      return NextResponse.json(
        { error: "Se requiere clave de administrador para modificar asignaciones" },
        { status: 403 }
      );
    }

    const isValid = await settingsService.validateKey(adminKey);
    if (!isValid) {
      return NextResponse.json(
        { error: "Clave de administrador incorrecta" },
        { status: 403 }
      );
    }

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

    // Check if assignment date is in the past (before today UTC)
    const today = new Date();
    const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const assignmentDate = new Date(existing.date);
    const isPast = assignmentDate.getTime() < todayUTC.getTime();

    if (existing.isLocked) {
      return NextResponse.json(
        { error: "No se puede editar una asignación bloqueada (histórica)" },
        { status: 403 }
      );
    }

    if (isPast && !force) {
      return NextResponse.json(
        {
          error: "No se puede modificar una asignación de un día pasado. Usá el modo emergencia para override.",
          requiresForce: true,
        },
        { status: 403 }
      );
    }

    // FIX (BC-01): validate the target employee EXISTS and belongs to the SAME
    // group as the assignment, so the invariant "assignment.groupId === employee.groupId"
    // is never broken (e.g. reassigning a Piso 1 assignment to a Piso 2 employee).
    const targetEmployee = await employeeRepository.findById(employeeId);
    if (!targetEmployee) {
      return NextResponse.json(
        { error: "El empleado indicado no existe" },
        { status: 404 }
      );
    }
    if (targetEmployee.groupId !== existing.groupId) {
      return NextResponse.json(
        { error: "El empleado pertenece a otro grupo y no puede asignarse a esta asignación" },
        { status: 400 }
      );
    }

    // Update the assignment
    const updated = await assignmentRepository.updateEmployee(id, employeeId);

    // Audit log
    await auditLogRepository.create({
      entityType: "assignment",
      entityId: id,
      action: force ? "emergency-edit" : "edit",
      changes: {
        previousEmployeeId: existing.employeeId,
        previousEmployeeName: existing.employee?.name,
        newEmployeeId: employeeId,
        newEmployeeName: updated.employee?.name,
        date: existing.date,
        taskName: existing.taskName,
        groupId: existing.groupId,
        force: !!force,
      },
      groupId: existing.groupId,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[assignments/update]", error);
    return NextResponse.json({ error: "Error al actualizar asignación" }, { status: 500 });
  }
}
