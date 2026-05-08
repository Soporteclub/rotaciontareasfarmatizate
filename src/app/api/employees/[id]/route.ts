// Employees [id] API Route
import { NextRequest, NextResponse } from "next/server";
import { employeeService } from "@/application/services/employee-service";
import { updateEmployeeSchema } from "@/application/validators/schemas";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const employee = await employeeService.getById(id);
    return NextResponse.json({ data: employee });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener empleado";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateEmployeeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const employee = await employeeService.update(id, parsed.data);
    return NextResponse.json({ data: employee });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar empleado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const employee = await employeeService.softDelete(id);
    return NextResponse.json({ data: employee });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al eliminar empleado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
