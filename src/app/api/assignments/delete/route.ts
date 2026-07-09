// Delete Assignments API Route
// POST /api/assignments/delete - Delete assignments for a group
// Header: x-admin-key: <admin key>
// Body: { groupId: string, startDate?: string, endDate?: string, force?: boolean }
// - Without dates: deletes ALL UNLOCKED assignments for the group (preserves history)
// - With dates: deletes UNLOCKED assignments within the date range (preserves history)
//
// FIX (API-05): Now requires admin key (header x-admin-key).
// FIX (API-08): Validates body with Zod.
// FIX (BUG-04): By default only deletes isLocked:false (preserves historical).
//               Pass { force: true } to also delete locked (requires admin anyway).

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assignmentService } from "@/backend/application/services/assignment-service";
import { validateAdminKey } from "@/backend/infrastructure/admin-guard";

const deleteAssignmentsSchema = z.object({
  groupId: z.string().min(1, "groupId es requerido"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  force: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  // Authorize via header so the body can still be parsed below
  const adminKey = request.headers.get("x-admin-key") || request.nextUrl.searchParams.get("adminKey") || "";
  const authorized = await validateAdminKey(adminKey);
  if (!authorized) {
    return NextResponse.json(
      { error: "Se requiere clave de administrador valida (header x-admin-key o query adminKey)" },
      { status: adminKey ? 403 : 401 }
    );
  }

  try {
    const body = await request.json();
    const parsed = deleteAssignmentsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { groupId, startDate, endDate, force } = parsed.data;

    let result;

    if (startDate && endDate) {
      // Delete by group + date range. By default preserves locked (historical).
      result = await assignmentService.deleteByGroupAndDateRange(
        groupId,
        startDate,
        endDate,
        { preserveLocked: !force }
      );
    } else {
      // Delete all unlocked assignments for the group.
      result = await assignmentService.deleteAllByGroup(groupId, {
        preserveLocked: !force,
      });
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
