// GET /api/health — sondeo de vida/ready para contenedores y balanceadores.
// FIX (BC-4): antes el HEALTHCHECK apuntaba a "/" que devuelve 200 incluso con
// la BD caída. Aquí se ejecuta `SELECT 1` contra la BD: si no responde, el
// container se marca como unhealthy (503). La respuesta NO filtra detalles
// sensibles (no se expone la URL de conexión).
import { NextResponse } from "next/server";
import { db } from "@/backend/infrastructure/database";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch {
    return NextResponse.json(
      { status: "error", error: "Database unreachable" },
      { status: 503 },
    );
  }
}

// Edge runtime compatibility: forzar ejecución en Node.js para poder tocar Prisma.
export const runtime = "nodejs";
