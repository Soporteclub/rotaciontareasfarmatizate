// API Docs Route - Serves the OpenAPI specification as JSON
// GET /api/docs - Get the OpenAPI 3.0.3 specification
//
// FIX (A2): requires an admin key (x-admin-key header). Previously this endpoint
// was public and only the UI link was hidden client-side — the spec leaked to
// anyone hitting the URL directly.

import { NextRequest, NextResponse } from "next/server";
import { openApiSpec } from "@/backend/infrastructure/openapi-spec";
import { validateAdminKey } from "@/backend/infrastructure/admin-guard";

export async function GET(request: NextRequest) {
  const adminKey = request.headers.get("x-admin-key") || "";
  const authorized = await validateAdminKey(adminKey);
  if (!authorized) {
    return NextResponse.json(
      { error: "Se requiere clave de administrador valida (header x-admin-key)" },
      { status: adminKey ? 403 : 401 }
    );
  }

  // FIX (F1): wrap in { data } for apiFetch consistency
  return NextResponse.json({ data: openApiSpec }, {
    headers: {
      "Cache-Control": "public, max-age=3600",
    },
  });
}
