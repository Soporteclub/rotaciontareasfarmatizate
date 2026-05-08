// Generate Assignments API Route
// POST /api/assignments/generate - Generate fair assignments using the Fairness Engine

import { NextRequest, NextResponse } from "next/server";
import { assignmentService } from "@/backend/application/services/assignment-service";
import { generateAssignmentsSchema } from "@/backend/application/validators/schemas";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = generateAssignmentsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.issues },
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
