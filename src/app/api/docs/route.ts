// API Docs Route - Serves the OpenAPI specification as JSON
// GET /api/docs - Get the OpenAPI 3.0.3 specification

import { NextResponse } from "next/server";
import { openApiSpec } from "@/backend/infrastructure/openapi-spec";

export async function GET() {
  return NextResponse.json(openApiSpec, {
    headers: {
      "Cache-Control": "public, max-age=3600",
    },
  });
}
