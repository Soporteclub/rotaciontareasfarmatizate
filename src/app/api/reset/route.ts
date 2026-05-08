// Reset API Route - Clear all data and re-seed
// POST /api/reset

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  try {
    // Delete all data in reverse dependency order
    await db.auditLog.deleteMany();
    await db.assignment.deleteMany();
    await db.assignmentRule.deleteMany();
    await db.employee.deleteMany();
    await db.assignmentGroup.deleteMany();

    return NextResponse.json({ message: "Base de datos reiniciada exitosamente" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al reiniciar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
