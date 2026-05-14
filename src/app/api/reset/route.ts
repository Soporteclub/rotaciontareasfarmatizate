// Reset API Route - Clear all data and re-seed
// POST /api/reset

import { NextResponse } from "next/server";
import { db } from "@/backend/infrastructure/database";

export async function POST() {
  try {
    // Delete all data in reverse dependency order
    await db.auditLog.deleteMany();
    await db.assignment.deleteMany();
    await db.taskEligibility.deleteMany();
    await db.rule.deleteMany();
    await db.employee.deleteMany();
    await db.group.deleteMany();
    await db.holiday.deleteMany();
    await db.settings.deleteMany();

    return NextResponse.json({ message: "Base de datos reiniciada exitosamente" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al reiniciar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
