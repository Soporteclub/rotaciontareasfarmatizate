// Balance Report API Route
// GET /api/assignments/balance?groupId=xxx&startDate=yyyy-mm-dd&endDate=yyyy-mm-dd - Get fairness balance report

import { NextRequest, NextResponse } from "next/server";
import { assignmentService } from "@/backend/application/services/assignment-service";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const groupId = searchParams.get("groupId");
    const startDate = searchParams.get("startDate") ?? undefined;
    const endDate = searchParams.get("endDate") ?? undefined;

    if (!groupId) {
      return NextResponse.json(
        { error: "groupId es requerido" },
        { status: 400 }
      );
    }

    const report = await assignmentService.getBalanceReport(groupId, startDate, endDate);
    return NextResponse.json({ data: report });
  } catch (error) {
    console.error("[balance/get]", error);
    return NextResponse.json({ error: "Error al obtener reporte de balance" }, { status: 500 });
  }
}
