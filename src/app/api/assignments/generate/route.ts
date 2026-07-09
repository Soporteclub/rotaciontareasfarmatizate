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
    const parsed = generateAssignmentsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await assignmentService.generate(parsed.data);
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al generar asignaciones";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
