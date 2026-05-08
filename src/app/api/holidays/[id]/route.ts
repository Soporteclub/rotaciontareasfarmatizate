// Holiday API Route - Single holiday operations
// PATCH /api/holidays/[id] - Update a holiday
// DELETE /api/holidays/[id] - Delete a holiday

import { NextRequest, NextResponse } from "next/server";
import { holidayService } from "@/backend/application/services";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updated = await holidayService.update(id, body);
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar festivo";
    console.error("Holiday PATCH error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await holidayService.delete(id);
    return NextResponse.json({ message: "Festivo eliminado" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al eliminar festivo";
    console.error("Holiday DELETE error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
