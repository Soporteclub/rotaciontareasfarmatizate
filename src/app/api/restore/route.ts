// Restore API Route - Restore database from backup JSON file
// POST /api/restore

import { NextResponse } from "next/server";
import { db } from "@/backend/infrastructure/database";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

const BACKUP_PATH = join(process.cwd(), "public", "backup.json");

// ─── Helper: convert ISO string dates back to Date objects ───

type RecordData = Record<string, unknown>;

function reviveDates(record: RecordData): RecordData {
  const result: RecordData = {};
  // Known date fields across all models
  const dateFields = new Set([
    "createdAt",
    "updatedAt",
    "joinDate",
    "leaveDate",
    "validFrom",
    "validTo",
    "date",
  ]);

  for (const [key, value] of Object.entries(record)) {
    if (dateFields.has(key) && typeof value === "string") {
      result[key] = new Date(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ─── Route handler ───────────────────────────────────────────

export async function POST() {
  try {
    // Check if backup file exists
    if (!existsSync(BACKUP_PATH)) {
      return NextResponse.json(
        { error: "No se encontró archivo de backup" },
        { status: 404 },
      );
    }

    // Read and parse backup
    const raw = await readFile(BACKUP_PATH, "utf-8");
    const backup = JSON.parse(raw);

    if (!backup.data) {
      return NextResponse.json(
        { error: "Formato de backup inválido: falta 'data'" },
        { status: 400 },
      );
    }

    const {
      settings = [],
      groups = [],
      employees = [],
      rules = [],
      assignments = [],
      taskEligibility = [],
      holidays = [],
      auditLogs = [],
    } = backup.data;

    // ── Delete all data in reverse dependency order ─────────────
    await db.auditLog.deleteMany();
    await db.assignment.deleteMany();
    await db.taskEligibility.deleteMany();
    await db.rule.deleteMany();
    await db.employee.deleteMany();
    await db.group.deleteMany();
    await db.holiday.deleteMany();
    await db.settings.deleteMany();

    // ── Recreate in dependency order ────────────────────────────

    // 1. Settings (preserving original IDs)
    if (settings.length > 0) {
      await Promise.all(
        settings.map((s: RecordData) =>
          db.settings.create({ data: reviveDates(s) as never }),
        ),
      );
    }

    // 2. Groups (preserving original IDs)
    if (groups.length > 0) {
      await Promise.all(
        groups.map((g: RecordData) =>
          db.group.create({ data: reviveDates(g) as never }),
        ),
      );
    }

    // 3. Employees (need group to exist first)
    if (employees.length > 0) {
      await Promise.all(
        employees.map((e: RecordData) =>
          db.employee.create({ data: reviveDates(e) as never }),
        ),
      );
    }

    // 4. Rules (need group to exist first)
    // Rule has @@unique([groupId, dayOfWeek, taskLabel])
    if (rules.length > 0) {
      await Promise.all(
        rules.map((r: RecordData) =>
          db.rule.create({ data: reviveDates(r) as never }),
        ),
      );
    }

    // 5. TaskEligibility (need employee to exist first)
    // TaskEligibility has @@unique([employeeId, taskName])
    if (taskEligibility.length > 0) {
      await Promise.all(
        taskEligibility.map((te: RecordData) =>
          db.taskEligibility.create({ data: reviveDates(te) as never }),
        ),
      );
    }

    // 6. Holidays (independent)
    // Holiday has @@unique([date, name])
    if (holidays.length > 0) {
      await Promise.all(
        holidays.map((h: RecordData) =>
          db.holiday.create({ data: reviveDates(h) as never }),
        ),
      );
    }

    // 7. Assignments (need group + employee to exist first)
    // Assignment has @@unique([groupId, date, taskName])
    if (assignments.length > 0) {
      await Promise.all(
        assignments.map((a: RecordData) =>
          db.assignment.create({ data: reviveDates(a) as never }),
        ),
      );
    }

    // 8. AuditLogs (need group to exist first)
    if (auditLogs.length > 0) {
      await Promise.all(
        auditLogs.map((al: RecordData) =>
          db.auditLog.create({ data: reviveDates(al) as never }),
        ),
      );
    }

    return NextResponse.json({
      message: "Base de datos restaurada exitosamente",
      timestamp: backup.timestamp,
      version: backup.version,
      restored: {
        settings: settings.length,
        groups: groups.length,
        employees: employees.length,
        rules: rules.length,
        taskEligibility: taskEligibility.length,
        holidays: holidays.length,
        assignments: assignments.length,
        auditLogs: auditLogs.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al restaurar";
    console.error("Restore error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
