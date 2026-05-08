// Rules [id] API Route
import { NextRequest, NextResponse } from "next/server";
import { ruleService } from "@/backend/application/services/rule-service";
import { updateRuleSchema } from "@/backend/application/validators/schemas";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rule = await ruleService.getById(id);
    return NextResponse.json({ data: rule });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener regla";
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
    const parsed = updateRuleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const rule = await ruleService.update(id, parsed.data);
    return NextResponse.json({ data: rule });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar regla";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rule = await ruleService.softDelete(id);
    return NextResponse.json({ data: rule });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al eliminar regla";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
