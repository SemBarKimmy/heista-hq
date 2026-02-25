export interface TokenUsageData {
  usedTokens: number
  limitTokens: number
  period: string
  updatedAt: string
  source: "openclaw" | "stub"
  todo?: string
}

export interface VpsStatusData {
  status: "online" | "degraded" | "offline" | "unknown"
  region: string
  uptimePercent: number
  cpuPercent: number
  ramPercent: number
  diskPercent: number
  updatedAt: string
  source: "endpoint" | "stub"
  todo?: string
}

export interface TrendItem {
  title: string
  source: "news" | "twitter"
  score: number
}

export interface TrendsData {
  fetchedAt: string
  updatedAt: string
  items: TrendItem[]
  source: "database" | "stub"
  todo?: string
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000

function nowIso() {
  return new Date().toISOString()
}

export async function getTokenUsage(fetcher: typeof fetch = fetch): Promise<TokenUsageData> {
  const endpoint = process.env.OPENCLAW_TOKEN_USAGE_ENDPOINT || "/api/openclaw/token-usage"

  try {
    const response = await fetcher(endpoint, { cache: "no-store" })
    if (!response.ok) throw new Error("token usage fetch failed")
    const data = (await response.json()) as Partial<TokenUsageData>
    return {
      usedTokens: data.usedTokens ?? 0,
      limitTokens: data.limitTokens ?? 0,
      period: data.period ?? "24h",
      updatedAt: data.updatedAt ?? nowIso(),
      source: data.source === "openclaw" ? "openclaw" : "stub",
      todo: data.todo,
    }
  } catch {
    return {
      usedTokens: 0,
      limitTokens: 0,
      period: "24h",
      updatedAt: nowIso(),
      source: "stub",
      todo: "TODO(elisa): expose OpenClaw token usage endpoint and wire auth/schema",
    }
  }
}

export async function getVpsStatus(fetcher: typeof fetch = fetch): Promise<VpsStatusData> {
  const endpoint = process.env.VPS_STATUS_ENDPOINT
  if (!endpoint) {
    return {
      status: "unknown",
      region: "n/a",
      uptimePercent: 0,
      cpuPercent: 0,
      ramPercent: 0,
      diskPercent: 0,
      updatedAt: nowIso(),
      source: "stub",
      todo: "TODO(elisa): connect VPS status endpoint/DB contract",
    }
  }

  try {
    const response = await fetcher(endpoint, { cache: "no-store" })
    if (!response.ok) throw new Error("vps fetch failed")
    const data = (await response.json()) as Partial<VpsStatusData>
    return {
      status: data.status ?? "unknown",
      region: data.region ?? "n/a",
      uptimePercent: data.uptimePercent ?? 0,
      cpuPercent: data.cpuPercent ?? 0,
      ramPercent: data.ramPercent ?? 0,
      diskPercent: data.diskPercent ?? 0,
      updatedAt: data.updatedAt ?? nowIso(),
      source: "endpoint",
      todo: data.todo,
    }
  } catch {
    return {
      status: "unknown",
      region: "n/a",
      uptimePercent: 0,
      cpuPercent: 0,
      ramPercent: 0,
      diskPercent: 0,
      updatedAt: nowIso(),
      source: "stub",
      todo: "TODO(elisa): endpoint unreachable, fallback to stub",
    }
  }
}

export async function getTrends(fetcher: typeof fetch = fetch): Promise<TrendsData> {
  const endpoint = process.env.TRENDS_ENDPOINT
  const ts = nowIso()

  if (!endpoint) {
    return {
      fetchedAt: ts,
      updatedAt: ts,
      items: [
        { title: "No trend feed configured", source: "news", score: 0 },
      ],
      source: "stub",
      todo: "TODO(andries): connect News/Twitter trends DB query endpoint",
    }
  }

  try {
    const response = await fetcher(endpoint, { cache: "no-store" })
    if (!response.ok) throw new Error("trends fetch failed")
    const data = (await response.json()) as Partial<TrendsData>
    const fetchedAt = data.fetchedAt ?? data.updatedAt ?? ts
    return {
      fetchedAt,
      updatedAt: data.updatedAt ?? fetchedAt,
      items: data.items ?? [],
      source: "database",
      todo: data.todo,
    }
  } catch {
    return {
      fetchedAt: ts,
      updatedAt: ts,
      items: [
        { title: "Trend feed unavailable", source: "twitter", score: 0 },
      ],
      source: "stub",
      todo: "TODO(andries): endpoint unreachable, fallback to stub",
    }
  }
}

export function isStaleByTwoHours(serverTimestamp: string, now = new Date()): boolean {
  const parsed = new Date(serverTimestamp)
  if (Number.isNaN(parsed.getTime())) return true
  return now.getTime() - parsed.getTime() > TWO_HOURS_MS
}

export function nextRefreshInLabel(serverTimestamp: string, now = new Date()): string {
  const parsed = new Date(serverTimestamp)
  if (Number.isNaN(parsed.getTime())) return "unknown"
  const nextMs = parsed.getTime() + TWO_HOURS_MS - now.getTime()
  if (nextMs <= 0) return "due now"
  const minutes = Math.ceil(nextMs / (60 * 1000))
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

export function formatTokenUsage(data: TokenUsageData): string {
  if (!data.limitTokens) return "0 / 0"
  return `${data.usedTokens.toLocaleString()} / ${data.limitTokens.toLocaleString()}`
}
