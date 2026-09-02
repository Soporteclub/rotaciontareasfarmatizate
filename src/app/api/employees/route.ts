// Employees API Route
// GET /api/employees - List employees
// POST /api/employees - Create employee

import { NextRequest, NextResponse } from "next/server";
import { employeeService } from "@/backend/application/services/employee-service";
import { createEmployeeSchema } from "@/backend/application/validators/schemas";
import { validateAdminKey } from "@/backend/infrastructure/admin-guard";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const groupId = searchParams.get("groupId") ?? undefined;
    const includeInactive = searchParams.get("includeInactive") === "true";

    const employees = await employeeService.getAll(groupId, includeInactive);
    return NextResponse.json({ data: employees });
  } catch (error) {
    console.error("[employees/get]", error);
    return NextResponse.json({ error: "Error al obtener empleados" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // FIX: require admin key to create employees
  const adminKey = request.headers.get("x-admin-key") || "";
  const authorized = await validateAdminKey(adminKey);
  if (!authorized) {
    return NextResponse.json(
      { error: "Se requiere clave de administrador válida (header x-admin-key)" },
      { status: adminKey ? 403 : 401 }
    );
  }

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
    console.error("[employees/create]", error);
    return NextResponse.json({ error: "Error al crear empleado" }, { status: 500 });
  }
}
