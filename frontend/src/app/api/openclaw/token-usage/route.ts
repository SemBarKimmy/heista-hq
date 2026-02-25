import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

interface SessionStatusShape {
  tokenUsage?: {
    usedTokens?: number
    limitTokens?: number
    period?: string
  }
}

export async function GET() {
  const statusEndpoint = process.env.OPENCLAW_SESSION_STATUS_ENDPOINT
  const nowIso = new Date().toISOString()

  if (!statusEndpoint) {
    return NextResponse.json({
      usedTokens: 0,
      limitTokens: 0,
      period: "24h",
      updatedAt: nowIso,
      source: "stub",
      todo: "TODO(elisa): set OPENCLAW_SESSION_STATUS_ENDPOINT and map tokenUsage contract",
    })
  }

  try {
    const response = await fetch(statusEndpoint, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`status endpoint failed: ${response.status}`)
    }

    const data = (await response.json()) as SessionStatusShape
    return NextResponse.json({
      usedTokens: data.tokenUsage?.usedTokens ?? 0,
      limitTokens: data.tokenUsage?.limitTokens ?? 0,
      period: data.tokenUsage?.period ?? "24h",
      updatedAt: nowIso,
      source: "openclaw",
    })
  } catch {
    return NextResponse.json({
      usedTokens: 0,
      limitTokens: 0,
      period: "24h",
      updatedAt: nowIso,
      source: "stub",
      todo: "TODO(elisa): OpenClaw endpoint unreachable, fallback active",
    })
  }
}
