// Backup API Route - Export all database data to a JSON file
// GET /api/backup  — Export and save backup
// POST /api/backup — Manual trigger backup

import { NextResponse } from "next/server";
import { db } from "@/backend/infrastructure/database";
import { writeFile } from "fs/promises";
import { join } from "path";

const BACKUP_PATH = join(process.cwd(), "public", "backup.json");

// ─── Helper: serialize Date fields to ISO strings ────────────

function serializeDates<T>(records: T[]): T[] {
  return records.map((record) => {
    const obj = record as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value instanceof Date) {
        result[key] = value.toISOString();
      } else {
        result[key] = value;
      }
    }
    return result as T;
  });
}

// ─── Core backup logic ───────────────────────────────────────

async function performBackup() {
  const [
    settings,
    groups,
    employees,
    rules,
    assignments,
    taskEligibility,
    holidays,
    auditLogs,
  ] = await Promise.all([
    db.settings.findMany(),
    db.group.findMany(),
    db.employee.findMany(),
    db.rule.findMany(),
    db.assignment.findMany(),
    db.taskEligibility.findMany(),
    db.holiday.findMany(),
    db.auditLog.findMany(),
  ]);

  const data = {
    settings: serializeDates(settings),
    groups: serializeDates(groups),
    employees: serializeDates(employees),
    rules: serializeDates(rules),
    assignments: serializeDates(assignments),
    taskEligibility: serializeDates(taskEligibility),
    holidays: serializeDates(holidays),
    auditLogs: serializeDates(auditLogs),
  };

  const timestamp = new Date().toISOString();
  const backup = { version: 1, timestamp, data };

  // Write compact JSON (no pretty-print) to save memory
  await writeFile(BACKUP_PATH, JSON.stringify(backup), "utf-8");

  return {
    timestamp,
    counts: {
      settings: data.settings.length,
      groups: data.groups.length,
      employees: data.employees.length,
      rules: data.rules.length,
      assignments: data.assignments.length,
      taskEligibility: data.taskEligibility.length,
      holidays: data.holidays.length,
      auditLogs: data.auditLogs.length,
    },
  };
}

// ─── Route handlers ──────────────────────────────────────────

export async function GET() {
  try {
    const result = await performBackup();
    return NextResponse.json({ message: "Backup creado exitosamente", ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al crear backup";
    console.error("Backup error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = await performBackup();
    return NextResponse.json({ message: "Backup manual creado exitosamente", ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al crear backup manual";
    console.error("Backup POST error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
