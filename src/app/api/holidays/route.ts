// Holiday API Route - Manage Colombian public holidays
// GET /api/holidays - List holidays (with optional date range filter)
// POST /api/holidays - Create a holiday
// POST /api/holidays?seed=true - Seed Colombian holidays for 2024-2030

import { NextRequest, NextResponse } from "next/server";
import { holidayRepository } from "@/backend/infrastructure/repositories";
import { generateColombianHolidaysForRange, formatDateKey } from "@/backend/domain/holidays/colombian-holidays";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const holidays = await holidayRepository.findAll({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      isActive: true,
    });

    return NextResponse.json(holidays);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener festivos";
    console.error("Holiday GET error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Special: seed Colombian holidays
    if (body.seed === true) {
      const startYear = body.startYear ?? 2024;
      const endYear = body.endYear ?? 2030;

      const holidays = generateColombianHolidaysForRange(startYear, endYear);

      const data = holidays.map((h) => ({
        date: new Date(h.date.getFullYear(), h.date.getMonth(), h.date.getDate()),
        name: h.name,
        type: h.type,
        isRecurring: h.type === "fixed",
        isActive: true,
      }));

      // Delete existing and re-seed
      await holidayRepository.deleteAll();
      const result = await holidayRepository.createMany(data);

      return NextResponse.json({
        message: `Seeded ${result.count} Colombian holidays (${startYear}-${endYear})`,
        count: result.count,
        years: endYear - startYear + 1,
      });
    }

    // Normal: create a single holiday
    const { date, name, type = "national", isRecurring = true } = body;
    if (!date || !name) {
      return NextResponse.json({ error: "Fecha y nombre son requeridos" }, { status: 400 });
    }

    const holiday = await holidayRepository.create({
      date: new Date(date),
      name,
      type,
      isRecurring,
      isActive: true,
    });

    return NextResponse.json(holiday, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al crear festivo";
    console.error("Holiday POST error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
