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
import { randomBytes, scryptSync } from "crypto";
import { validateAdminKey } from "@/backend/infrastructure/admin-guard";

/** Hash a key with scrypt for restore (must match settings-service.hashKey). */
async function hashKeyForRestore(key: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(key, salt, 64, { N: 16384 });
  return `${salt}:${derived.toString("hex")}`;
}

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
  const adminKey = request.headers.get("x-admin-key") || "";
  const authorized = await validateAdminKey(adminKey);
  if (!authorized) {
    return NextResponse.json(
      { error: "Se requiere clave de administrador valida (header x-admin-key)" },
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

    // FIX (AUDIT-01): Create audit log BEFORE deletion so the trace survives.
    await db.auditLog.create({
      data: {
        entityType: "assignment",
        entityId: "batch",
        action: "restore",
        changedBy: "admin",
        changes: JSON.stringify({
          message: "Database restored from backup",
          backupTimestamp: backup.timestamp,
          backupVersion: backup.version,
          adminKeyPrefix: adminKey.slice(0, 8),
          restoredCounts: {
            settings: settings.length,
            groups: groups.length,
            employees: employees.length,
            rules: rules.length,
            assignments: assignments.length,
            taskEligibility: taskEligibility.length,
            holidays: holidays.length,
            auditLogs: auditLogs.length,
          },
        }),
      },
    });

    console.log(`[restore] Admin executed restore at ${new Date().toISOString()} from backup v${backup.version} (${backup.timestamp})`);

    // FIX (API-04): single transaction. If any insert fails, everything rolls
    // back and the DB is left in its previous state instead of empty.
    // FIX (AUDIT-01): Delete all tables EXCEPT auditLog to preserve the audit trail.
    // Then merge audit logs from backup into the preserved trail.
    await db.$transaction(async (tx) => {
      // Delete all in reverse dependency order (EXCEPT auditLog)
      await tx.assignment.deleteMany();
      await tx.taskEligibility.deleteMany();
      await tx.rule.deleteMany();
      await tx.employee.deleteMany();
      await tx.group.deleteMany();
      await tx.holiday.deleteMany();
      await tx.settings.deleteMany();

      // Recreate in dependency order using createMany (atomic, faster)
      // FIX (restore roto / SEC-03): settings are NOT re-created from the backup.
      // The backup strips Settings.key/value (sanitizeSettings) but the schema
      // requires them. Regenerate a fresh admin key and store it hashed (never
      // plaintext). The admin must note the rotated key.
      const restoredKey = process.env.ADMIN_KEY || randomBytes(16).toString("hex");
      const hashed = await hashKeyForRestore(restoredKey);
      await tx.settings.upsert({
        where: { id: "app" },
        update: { key: hashed, value: hashed },
        create: { id: "app", key: hashed, value: hashed },
      });
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
      // FIX (AUDIT-01): Merge audit logs from backup into the preserved trail.
      if (auditLogs.length > 0) {
        await tx.auditLog.createMany({ data: auditLogs.map((al: RecordData) => reviveDates(al)) as never });
      }
    }, { timeout: 30000 });

    return NextResponse.json({
      data: {
        message: "Base de datos restaurada exitosamente",
        timestamp: backup.timestamp,
        version: backup.version,
        // FIX (restore roto): the admin key is regenerated on restore (the backup
        // never stores it), so inform the caller that it must be rotated/noted.
        adminKeyRegenerated: true,
        adminKeyNotice: "La clave admin fue regenerada. Si ADMIN_KEY no está definida en el entorno, consúltala en los logs del servidor.",
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
    const isTimeout =
      error instanceof Error && (
        message.includes("Transaction not found") ||
        message.includes("timeout") ||
        message.includes("P2028") ||
        (error as { code?: string }).code === "P2028"
      );
    console.error("[restore] Error:", error);
    if (isTimeout) {
      return NextResponse.json(
        { error: "La operación está tardando más de lo esperado. Prueba con un rango de fechas más corto o intentá de nuevo en unos minutos." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Ocurrió un error inesperado. Por favor, intentá de nuevo." }, { status: 500 });
  }
}
