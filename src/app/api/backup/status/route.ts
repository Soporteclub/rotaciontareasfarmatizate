// Backup Status API Route - Check if a backup exists and its metadata
// GET /api/backup/status

import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

const BACKUP_PATH = join(process.cwd(), "public", "backup.json");

export async function GET() {
  try {
    if (!existsSync(BACKUP_PATH)) {
      return NextResponse.json({ exists: false });
    }

    const raw = await readFile(BACKUP_PATH, "utf-8");
    const backup = JSON.parse(raw);

    return NextResponse.json({
      exists: true,
      timestamp: backup.timestamp,
      version: backup.version,
      counts: {
        settings: backup.data?.settings?.length ?? 0,
        groups: backup.data?.groups?.length ?? 0,
        employees: backup.data?.employees?.length ?? 0,
        rules: backup.data?.rules?.length ?? 0,
        taskEligibility: backup.data?.taskEligibility?.length ?? 0,
        holidays: backup.data?.holidays?.length ?? 0,
        assignments: backup.data?.assignments?.length ?? 0,
        auditLogs: backup.data?.auditLogs?.length ?? 0,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al verificar backup";
    console.error("Backup status error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
