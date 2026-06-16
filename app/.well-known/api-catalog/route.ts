import { NextResponse } from "next/server";
import { agentCatalog } from "@/lib/agent-discovery";

export function GET() {
  return NextResponse.json(agentCatalog, {
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}

