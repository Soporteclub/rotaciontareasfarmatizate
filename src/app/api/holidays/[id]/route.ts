// Holiday API Route - Single holiday operations
// PATCH /api/holidays/[id] - Update a holiday
// DELETE /api/holidays/[id] - Delete a holiday

import { NextRequest, NextResponse } from "next/server";
import { holidayRepository } from "@/backend/infrastructure/repositories";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, date, type, isActive } = body;

    const existing = await holidayRepository.findById(id);
    if (!existing) {
      return NextResponse.json({ error: "Festivo no encontrado" }, { status: 404 });
    }

    const updated = await holidayRepository.update(id, {
      ...(name !== undefined && { name }),
      ...(date !== undefined && { date: new Date(date) }),
      ...(type !== undefined && { type }),
      ...(isActive !== undefined && { isActive }),
    });

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

    const existing = await holidayRepository.findById(id);
    if (!existing) {
      return NextResponse.json({ error: "Festivo no encontrado" }, { status: 404 });
    }

    await holidayRepository.delete(id);
    return NextResponse.json({ message: "Festivo eliminado" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al eliminar festivo";
    console.error("Holiday DELETE error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
