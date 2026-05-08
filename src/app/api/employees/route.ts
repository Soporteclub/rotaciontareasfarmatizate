// Employees API Route
// GET /api/employees - List employees
// POST /api/employees - Create employee

import { NextRequest, NextResponse } from "next/server";
import { employeeService } from "@/application/services/employee-service";
import { createEmployeeSchema } from "@/application/validators/schemas";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const groupId = searchParams.get("groupId") ?? undefined;
    const includeInactive = searchParams.get("includeInactive") === "true";

    const employees = await employeeService.getAll(groupId, includeInactive);
    return NextResponse.json({ data: employees });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener empleados";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createEmployeeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const employee = await employeeService.create(parsed.data);
    return NextResponse.json({ data: employee }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al crear empleado";
    const status = message.includes("ya existe") || message.includes("no existe") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
