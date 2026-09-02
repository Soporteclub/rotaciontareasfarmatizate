// Holiday API Route - Manage Colombian public holidays
// GET /api/holidays - List holidays (with optional date range filter)
// POST /api/holidays - Create a holiday
// POST /api/holidays?seed=true - Seed Colombian holidays for 2024-2030

import { NextRequest, NextResponse } from "next/server";
import { holidayService } from "@/backend/application/services";
import { validateAdminKey } from "@/backend/infrastructure/admin-guard";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const holidays = await holidayService.getAll({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    // FIX (F1): wrap in { data } so apiFetch (which reads json.data) works
    return NextResponse.json({ data: holidays });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener festivos";
    console.error("Holiday GET error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // FIX: require admin key to create holidays (incl. reseed)
  const adminKey = request.headers.get("x-admin-key") || "";
  const authorized = await validateAdminKey(adminKey);
  if (!authorized) {
    return NextResponse.json(
      { error: "Se requiere clave de administrador válida (header x-admin-key)" },
      { status: adminKey ? 403 : 401 }
    );
  }

  try {
    const body = await request.json();

    // Special: seed Colombian holidays
    if (body.seed === true) {
      const startYear = body.startYear ?? 2024;
      const endYear = body.endYear ?? 2030;
      const result = await holidayService.seedColombianHolidays(startYear, endYear);
      return NextResponse.json({ data: result });
    }

    // Normal: create a single holiday
    const holiday = await holidayService.create(body);
    return NextResponse.json({ data: holiday }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al crear festivo";
    console.error("Holiday POST error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
