import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  formatTokenUsage,
  getTokenUsage,
  getTrends,
  getVpsStatus,
  isStaleByTwoHours,
  nextRefreshInLabel,
} from "../lib/dashboard"

describe("dashboard adapters", () => {
  const env = { ...process.env }

  beforeEach(() => {
    vi.restoreAllMocks()
    process.env = { ...env }
  })

  afterEach(() => {
    process.env = env
  })

  it("returns token usage from OpenClaw endpoint when available", async () => {
    process.env.OPENCLAW_TOKEN_USAGE_ENDPOINT = "https://example.com/openclaw"
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ usedTokens: 1234, limitTokens: 8000, period: "24h", updatedAt: "2026-01-01T00:00:00.000Z", source: "openclaw" }),
    })

    const data = await getTokenUsage(mockFetch as unknown as typeof fetch)
    expect(data.source).toBe("openclaw")
    expect(data.usedTokens).toBe(1234)
  })

  it("maps VPS endpoint response", async () => {
    process.env.VPS_STATUS_ENDPOINT = "https://example.com/vps"
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "online", region: "sgp1", uptimePercent: 99.9, cpuPercent: 20, ramPercent: 44, diskPercent: 61, updatedAt: "2026-01-01T00:00:00.000Z" }),
    })

    const data = await getVpsStatus(mockFetch as unknown as typeof fetch)
    expect(data.source).toBe("endpoint")
    expect(data.status).toBe("online")
    expect(data.cpuPercent).toBe(20)
  })

  it("marks trends stale after 2 hours", () => {
    const base = new Date("2026-01-01T12:00:00.000Z")
    const oldTs = "2026-01-01T09:59:59.000Z"
    expect(isStaleByTwoHours(oldTs, base)).toBe(true)
  })

  it("formats next refresh label", () => {
    const base = new Date("2026-01-01T12:00:00.000Z")
    const ts = "2026-01-01T11:30:00.000Z"
    expect(nextRefreshInLabel(ts, base)).toBe("1h 30m")
  })

  it("formats token usage", () => {
    expect(formatTokenUsage({ usedTokens: 1200, limitTokens: 8000, period: "24h", updatedAt: "2026-01-01T00:00:00.000Z", source: "stub" })).toBe("1,200 / 8,000")
  })

  it("returns trends fallback on failed endpoint", async () => {
    process.env.TRENDS_ENDPOINT = "https://example.com/trends"
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    const data = await getTrends(mockFetch as unknown as typeof fetch)
    expect(data.source).toBe("stub")
    expect(data.items.length).toBeGreaterThan(0)
  })
})
