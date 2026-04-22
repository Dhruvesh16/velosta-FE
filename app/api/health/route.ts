import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? "";

  const checks: Record<string, string> = { fe: "ok", api_gateway: "unknown" };
  let overall: "ok" | "degraded" = "ok";

  if (apiBase) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${apiBase}/health`, {
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timer);
      checks.api_gateway = res.ok ? "ok" : `http_${res.status}`;
      if (!res.ok) overall = "degraded";
    } catch {
      checks.api_gateway = "unreachable";
      overall = "degraded";
    }
  } else {
    checks.api_gateway = "not_configured";
  }

  return NextResponse.json(
    {
      service: "velosta-fe",
      status: overall,
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: overall === "ok" ? 200 : 503 }
  );
}
