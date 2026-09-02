// Backup Status API Route - Check if a backup exists and its metadata
// GET /api/backup/status
// Header: x-admin-key: <admin key>
//
// FIX (API-29, SEC-03): Now requires admin key and reads from /data/ (not public/).

import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { validateAdminKey } from "@/backend/infrastructure/admin-guard";

// FIX (SEC-03): read from /data/, not public/
const BACKUP_PATH = join(process.cwd(), "data", "backup.json");

export async function GET(request: NextRequest) {
  // FIX (API-29): require admin key — backup metadata is sensitive
  const adminKey = request.headers.get("x-admin-key") || "";
  const authorized = await validateAdminKey(adminKey);
  if (!authorized) {
    return NextResponse.json(
      { error: "Se requiere clave de administrador valida (header x-admin-key)" },
      { status: adminKey ? 403 : 401 }
    );
  }

  try {
    if (!existsSync(BACKUP_PATH)) {
      return NextResponse.json({ data: { exists: false } });
    }

    const raw = await readFile(BACKUP_PATH, "utf-8");
    const backup = JSON.parse(raw);

    return NextResponse.json({
      data: {
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
      },
    });
  } catch (error) {
    console.error("[backup/status]", error);
    return NextResponse.json({ error: "Error al verificar backup" }, { status: 500 });
  }
}
