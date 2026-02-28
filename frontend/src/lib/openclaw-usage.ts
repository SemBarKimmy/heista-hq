export interface UsageWindowModelAgg {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  cost: number
  calls: number
}

export interface UsageWindowsData {
  source: "openclaw" | "stub"
  updatedAt: string
  fiveHour?: {
    perModel: Record<string, UsageWindowModelAgg>
    windowStart: string | null
    windowResetIn: number
    recentCalls: Array<{
      timestamp: string
      model: string
      input: number
      output: number
      cacheRead: number
      cacheWrite: number
      cost: number
      ago: string
    }>
  }
  weekly?: {
    perModel: Record<string, UsageWindowModelAgg>
  }
  burnRate?: {
    tokensPerMinute: number
    costPerMinute: number
  }
  error?: string
}

export interface RateLimitEvent {
  timestamp: string
  detail: string
  provider?: string
  model?: string
}

export interface RateLimitEventsData {
  source: "openclaw" | "stub"
  updatedAt: string
  window: string
  events: RateLimitEvent[]
}

function nowIso() {
  return new Date().toISOString()
}

const REQUIRED_API_URL = "https://heistadev.danuseta.my.id"

function normalizeBaseUrl(input?: string) {
  const value = (input || "").trim()
  if (!value) return REQUIRED_API_URL
  return value.endsWith("/") ? value.slice(0, -1) : value
}

function endpoint(path: string) {
  const base = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL)
  return `${base}${path}`
}

export async function getUsageWindows(fetcher: typeof fetch = fetch): Promise<UsageWindowsData> {
  const usageEndpoint = process.env.OPENCLAW_USAGE_WINDOWS_ENDPOINT || endpoint("/api/usage-windows")

  try {
    const response = await fetcher(usageEndpoint, { cache: "no-store" })
    if (!response.ok) throw new Error("usage windows fetch failed")
    const data = (await response.json()) as Partial<UsageWindowsData>
    return {
      source: data.source === "openclaw" ? "openclaw" : "stub",
      updatedAt: data.updatedAt ?? nowIso(),
      fiveHour: data.fiveHour as any,
      weekly: data.weekly as any,
      burnRate: data.burnRate as any,
      error: (data as any).error,
    }
  } catch {
    return {
      source: "stub",
      updatedAt: nowIso(),
      fiveHour: { perModel: {}, windowStart: null, windowResetIn: 0, recentCalls: [] },
      weekly: { perModel: {} },
      burnRate: { tokensPerMinute: 0, costPerMinute: 0 },
      error: "Usage windows endpoint unavailable; check NEXT_PUBLIC_API_URL or OPENCLAW_USAGE_WINDOWS_ENDPOINT.",
    }
  }
}

export async function getRateLimitEvents(fetcher: typeof fetch = fetch): Promise<RateLimitEventsData> {
  const eventsEndpoint = process.env.OPENCLAW_RATE_LIMIT_EVENTS_ENDPOINT || endpoint("/api/rate-limit-events")

  try {
    const response = await fetcher(eventsEndpoint, { cache: "no-store" })
    if (!response.ok) throw new Error("rate limit events fetch failed")
    const data = (await response.json()) as Partial<RateLimitEventsData>
    return {
      source: data.source === "openclaw" ? "openclaw" : "stub",
      updatedAt: data.updatedAt ?? nowIso(),
      window: data.window ?? "5h",
      events: (data.events ?? []) as RateLimitEvent[],
    }
  } catch {
    return {
      source: "stub",
      updatedAt: nowIso(),
      window: "5h",
      events: [],
    }
  }
}
