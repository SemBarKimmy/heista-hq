import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { getRateLimitEvents, getUsageWindows } from "../lib/openclaw-usage"

describe("openclaw usage adapters", () => {
  const env = { ...process.env }

  beforeEach(() => {
    vi.restoreAllMocks()
    process.env = { ...env }
  })

  afterEach(() => {
    process.env = env
  })

  it("builds usage windows endpoint from NEXT_PUBLIC_API_URL by default", async () => {
    delete process.env.OPENCLAW_USAGE_WINDOWS_ENDPOINT
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com/"

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ source: "openclaw", updatedAt: "2026-01-01T00:00:00.000Z" }),
    })

    await getUsageWindows(mockFetch as unknown as typeof fetch)
    expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/api/usage-windows", { cache: "no-store" })
  })

  it("builds rate limit events endpoint from NEXT_PUBLIC_API_URL by default", async () => {
    delete process.env.OPENCLAW_RATE_LIMIT_EVENTS_ENDPOINT
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com"

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ source: "openclaw", updatedAt: "2026-01-01T00:00:00.000Z", window: "5h", events: [] }),
    })

    await getRateLimitEvents(mockFetch as unknown as typeof fetch)
    expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/api/rate-limit-events", { cache: "no-store" })
  })

  it("returns usage windows fallback payload on failed endpoint", async () => {
    process.env.OPENCLAW_USAGE_WINDOWS_ENDPOINT = "https://example.com/usage"

    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    const data = await getUsageWindows(mockFetch as unknown as typeof fetch)

    expect(data.source).toBe("stub")
    expect(data.error).toContain("Usage windows endpoint unavailable")
    expect(data.fiveHour?.recentCalls).toEqual([])
  })
})
