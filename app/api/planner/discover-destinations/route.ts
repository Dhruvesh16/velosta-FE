import { NextRequest, NextResponse } from "next/server";

function readApiBase(): string {
  return (
    process.env.API_BASE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
    ""
  );
}

export async function POST(req: NextRequest) {
  const apiBase = readApiBase();
  if (!apiBase) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "api_not_configured",
          message: "API base URL is not configured.",
          details: {},
        },
      },
      { status: 503 }
    );
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const body = await req.text();

  try {
    const upstream = await fetch(`${apiBase}/api/planner/discover-destinations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body,
      cache: "no-store",
    });

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "network_error",
          message: "Could not reach the Velosta server. Check that the backend is running.",
          details: {},
        },
      },
      { status: 503 }
    );
  }
}

