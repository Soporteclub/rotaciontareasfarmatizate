// Generate Assignments API Route
// POST /api/assignments/generate - Generate fair assignments using the Fairness Engine
// Header: x-admin-key: <admin key>
//
// FIX (API-06): Now requires admin key to prevent anonymous sabotage.
// FIX (FE-02): Combined with the removal of auto-generation in useAutoInitialize,
//              generation is now an explicit admin action only.

import { NextRequest, NextResponse } from "next/server";
import { assignmentService } from "@/backend/application/services/assignment-service";
import { generateAssignmentsSchema } from "@/backend/application/validators/schemas";
import { validateAdminKey } from "@/backend/infrastructure/admin-guard";

export async function POST(request: NextRequest) {
  // Authorize via header so the body can still be parsed for the schema
  const adminKey = request.headers.get("x-admin-key") || "";
  const authorized = await validateAdminKey(adminKey);
  if (!authorized) {
    return NextResponse.json(
      { error: "Se requiere clave de administrador valida (header x-admin-key)" },
      { status: adminKey ? 403 : 401 }
    );
  }

  try {
    const body = await request.json();
    const parsed = generateAssignmentsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await assignmentService.generate(parsed.data);

    // FIX (EDGE-04): If employeeId provided, filter results to that employee only
    if (parsed.data.employeeId) {
      result.assignments = result.assignments.filter(
        (a) => a.employeeId === parsed.data.employeeId
      );
    }

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    const isTimeout =
      error instanceof Error && (
        (error as Error).message.includes("Transaction not found") ||
        (error as Error).message.includes("timeout") ||
        (error as Error).message.includes("P2028") ||
        (error as { code?: string }).code === "P2028"
      );
    console.error("[generate]", error);
    if (isTimeout) {
      return NextResponse.json(
        { error: "La operación está tardando más de lo esperado. Prueba con un rango de fechas más corto o intentá de nuevo en unos minutos." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Ocurrió un error inesperado. Por favor, intentá de nuevo." }, { status: 500 });
  }
}
