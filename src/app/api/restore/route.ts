// Restore API Route - Restore database from backup JSON file
// POST /api/restore
//
// FIX (API-04): Now requires admin key (requireAdmin).
// FIX (API-04): Wrapped in a transaction so a mid-way failure rolls back
//               (previously left the DB empty if an insert failed).
// FIX (API-03): No longer reads from public/ — reads from /data/backup.json.
// FIX (SEC-03): The backup file is no longer web-accessible.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/infrastructure/database";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { validateAdminKey } from "@/backend/infrastructure/admin-guard";

// FIX (SEC-03): moved out of public/ so it is not served as a static asset
const BACKUP_PATH = join(process.cwd(), "data", "backup.json");

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

export async function POST(request: NextRequest) {
  // Authorize via header
  const adminKey = request.headers.get("x-admin-key") || request.nextUrl.searchParams.get("adminKey") || "";
  const authorized = await validateAdminKey(adminKey);
  if (!authorized) {
    return NextResponse.json(
      { error: "Se requiere clave de administrador valida (header x-admin-key o query adminKey)" },
      { status: adminKey ? 403 : 401 }
    );
  }

  try {
    // Check if backup file exists
    if (!existsSync(BACKUP_PATH)) {
      return NextResponse.json(
        { error: "No se encontro archivo de backup" },
        { status: 404 },
      );
    }

    // Read and parse backup
    const raw = await readFile(BACKUP_PATH, "utf-8");
    const backup = JSON.parse(raw);

    if (!backup.data) {
      return NextResponse.json(
        { error: "Formato de backup invalido: falta 'data'" },
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

    // FIX (API-04): single transaction. If any insert fails, everything rolls
    // back and the DB is left in its previous state instead of empty.
    await db.$transaction(async (tx) => {
      // Delete all in reverse dependency order
      await tx.auditLog.deleteMany();
      await tx.assignment.deleteMany();
      await tx.taskEligibility.deleteMany();
      await tx.rule.deleteMany();
      await tx.employee.deleteMany();
      await tx.group.deleteMany();
      await tx.holiday.deleteMany();
      await tx.settings.deleteMany();

      // Recreate in dependency order using createMany (atomic, faster)
      if (settings.length > 0) {
        await tx.settings.createMany({ data: settings.map((s: RecordData) => reviveDates(s)) as never });
      }
      if (groups.length > 0) {
        await tx.group.createMany({ data: groups.map((g: RecordData) => reviveDates(g)) as never });
      }
      if (employees.length > 0) {
        await tx.employee.createMany({ data: employees.map((e: RecordData) => reviveDates(e)) as never });
      }
      if (rules.length > 0) {
        await tx.rule.createMany({ data: rules.map((r: RecordData) => reviveDates(r)) as never });
      }
      if (taskEligibility.length > 0) {
        await tx.taskEligibility.createMany({ data: taskEligibility.map((te: RecordData) => reviveDates(te)) as never });
      }
      if (holidays.length > 0) {
        await tx.holiday.createMany({ data: holidays.map((h: RecordData) => reviveDates(h)) as never });
      }
      if (assignments.length > 0) {
        await tx.assignment.createMany({ data: assignments.map((a: RecordData) => reviveDates(a)) as never });
      }
      if (auditLogs.length > 0) {
        await tx.auditLog.createMany({ data: auditLogs.map((al: RecordData) => reviveDates(al)) as never });
      }
    });

    return NextResponse.json({
      data: {
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
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al restaurar";
    console.error("Restore error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
