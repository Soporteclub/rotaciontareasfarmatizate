// Balance Report API Route
// GET /api/assignments/balance?groupId=xxx - Get fairness balance report

import { NextRequest, NextResponse } from "next/server";
import { assignmentService } from "@/application/services/assignment-service";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const groupId = searchParams.get("groupId");

    if (!groupId) {
      return NextResponse.json(
        { error: "groupId es requerido" },
        { status: 400 }
      );
    }

    const report = await assignmentService.getBalanceReport(groupId);
    return NextResponse.json({ data: report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener reporte de balance";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
