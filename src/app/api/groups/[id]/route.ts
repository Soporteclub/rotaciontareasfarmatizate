// Groups [id] API Route - CRUD for single group
import { NextRequest, NextResponse } from "next/server";
import { groupService } from "@/backend/application/services/group-service";
import { updateGroupSchema } from "@/backend/application/validators/schemas";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const group = await groupService.getById(id);
    return NextResponse.json({ data: group });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener grupo";
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
    const parsed = updateGroupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const group = await groupService.update(id, parsed.data);
    return NextResponse.json({ data: group });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar grupo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const group = await groupService.softDelete(id);
    return NextResponse.json({ data: group });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al eliminar grupo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
