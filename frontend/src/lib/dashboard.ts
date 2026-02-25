export interface TokenUsageData {
  usedTokens: number
  limitTokens: number
  period: string
  source: "openclaw" | "stub"
  todo?: string
}

export interface VpsStatusData {
  status: "online" | "degraded" | "offline" | "unknown"
  region: string
  uptimePercent: number
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
  items: TrendItem[]
  source: "database" | "stub"
  todo?: string
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  })

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
}

export async function getTokenUsage(fetcher: typeof fetch = fetch): Promise<TokenUsageData> {
  const endpoint = process.env.OPENCLAW_TOKEN_USAGE_ENDPOINT
  if (!endpoint) {
    return {
      usedTokens: 0,
      limitTokens: 0,
      period: "24h",
      source: "stub",
      todo: "TODO(elisa): expose OpenClaw token usage endpoint and wire auth/schema",
    }
  }

  try {
    const response = await fetcher(endpoint, { cache: "no-store" })
    if (!response.ok) throw new Error("token usage fetch failed")
    const data = (await response.json()) as TokenUsageData
    return { ...data, source: "openclaw" }
  } catch {
    return {
      usedTokens: 0,
      limitTokens: 0,
      period: "24h",
      source: "stub",
      todo: "TODO(elisa): endpoint unreachable, fallback to stub",
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
      source: "stub",
      todo: "TODO(elisa): connect VPS status endpoint/DB contract",
    }
  }

  try {
    const response = await fetcher(endpoint, { cache: "no-store" })
    if (!response.ok) throw new Error("vps fetch failed")
    const data = (await response.json()) as VpsStatusData
    return { ...data, source: "endpoint" }
  } catch {
    return {
      status: "unknown",
      region: "n/a",
      uptimePercent: 0,
      source: "stub",
      todo: "TODO(elisa): endpoint unreachable, fallback to stub",
    }
  }
}

export async function getTrends(fetcher: typeof fetch = fetch): Promise<TrendsData> {
  const endpoint = process.env.TRENDS_ENDPOINT
  const nowIso = new Date().toISOString()

  if (!endpoint) {
    return {
      fetchedAt: nowIso,
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
    const data = (await response.json()) as TrendsData
    return {
      ...data,
      source: "database",
      fetchedAt: data.fetchedAt ?? nowIso,
    }
  } catch {
    return {
      fetchedAt: nowIso,
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

export function formatTokenUsage(data: TokenUsageData): string {
  if (!data.limitTokens) return "0 / 0"
  return `${data.usedTokens.toLocaleString()} / ${data.limitTokens.toLocaleString()}`
}
