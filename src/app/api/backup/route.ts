// Backup API Route - Export all database data to a JSON file
// POST /api/backup — Manual trigger backup (requires admin key)
// Header: x-admin-key: <admin key>
//
// FIX (API-03, SEC-03): Eliminated GET (CSRF-exploitable, wrote to public/).
// FIX (SEC-03): Backup file is now written to /data/backup.json (not public/),
//               so it is NOT served as a static asset.
// FIX (SEC-01): The admin key (Settings.key) is excluded from the dump.
// FIX (API-03): POST now requires admin key.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/infrastructure/database";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { validateAdminKey } from "@/backend/infrastructure/admin-guard";

// FIX (SEC-03): moved out of public/ so it is not served as a static asset
const BACKUP_DIR = join(process.cwd(), "data");
const BACKUP_PATH = join(BACKUP_DIR, "backup.json");

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

/**
 * Strips sensitive fields (admin key) from settings before dumping.
 * FIX (SEC-01): the admin key must never appear in a backup file.
 */
function sanitizeSettings(settings: unknown[]): unknown[] {
  return settings.map((s) => {
    const obj = s as Record<string, unknown>;
    return {
      id: obj.id,
      // Omit `key` and `value` (admin key) entirely
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    };
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
    // FIX (SEC-01): sanitize settings — no admin key in the dump
    settings: serializeDates(sanitizeSettings(settings)),
    groups: serializeDates(groups),
    employees: serializeDates(employees),
    rules: serializeDates(rules),
    assignments: serializeDates(assignments),
    taskEligibility: serializeDates(taskEligibility),
    holidays: serializeDates(holidays),
    auditLogs: serializeDates(auditLogs),
  };

  const timestamp = new Date().toISOString();
  const backup = { version: 2, timestamp, data };

  // Ensure /data exists, then write outside of public/
  await mkdir(BACKUP_DIR, { recursive: true });
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

// ─── Route handler ──────────────────────────────────────────
// FIX (API-03): only POST, no GET. CSRF is not applicable to POST with
// custom header requirement (browsers won't send custom headers cross-origin
// without CORS preflight, which we don't enable for this route).

export async function POST(request: NextRequest) {
  // Authorize via header
  const adminKey = request.headers.get("x-admin-key") || "";
  const authorized = await validateAdminKey(adminKey);
  if (!authorized) {
    return NextResponse.json(
      { error: "Se requiere clave de administrador valida (header x-admin-key)" },
      { status: adminKey ? 403 : 401 }
    );
  }

  try {
    const result = await performBackup();
    return NextResponse.json({ data: { message: "Backup creado exitosamente", ...result } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al crear backup";
    console.error("Backup error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
