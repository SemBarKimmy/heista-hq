"use client"

import * as React from "react"
import {
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Cpu,
  HardDrive,
  MemoryStick,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  formatCompactNumber,
  formatMsAsShort,
  formatTokenUsage,
  formatWibDateTime,
  getApiBaseUrl,
  isStaleByTwoHours,
  summarizeUsageWindow,
  type RateLimitEventsData,
  type TokenUsageData,
  type TrendsData,
  type UsageWindowsData,
  type VpsStatusData,
} from "@/lib/dashboard"

type Loadable<T> = {
  data: T | null
  loading: boolean
  error: string | null
  updatedAt: string | null
}

type NewsItem = {
  title: string
  source: string
  url?: string
  publishedAt?: string
}

type NewsFeedData = {
  updatedAt: string
  source: "database" | "stub"
  items: NewsItem[]
  todo?: string
}

const POLL_FAST_MS = 12_000
const POLL_SLOW_MS = 60_000

function usePoller<T>(
  key: string,
  url: string,
  options?: {
    intervalMs?: number
    initial?: T | null
    transform?: (input: any) => T
  },
): Loadable<T> & { refresh: () => void } {
  const intervalMs = options?.intervalMs ?? POLL_FAST_MS
  const transform = options?.transform

  const [state, setState] = React.useState<Loadable<T>>({
    data: options?.initial ?? null,
    loading: options?.initial == null,
    error: null,
    updatedAt: null,
  })

  const refresh = React.useCallback(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 8_000)

    setState((prev) => ({ ...prev, loading: prev.data == null, error: null }))

    fetch(url, { cache: "no-store", signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        const json = await res.json()
        return transform ? transform(json) : (json as T)
      })
      .then((data) => {
        setState({ data, loading: false, error: null, updatedAt: new Date().toISOString() })
      })
      .catch((err) => {
        const msg = err?.name === "AbortError" ? "timeout" : String(err?.message ?? err)
        setState((prev) => ({ ...prev, loading: false, error: msg }))
      })
      .finally(() => window.clearTimeout(timeout))

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [transform, url])

  React.useEffect(() => {
    refresh()
    const id = window.setInterval(refresh, intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs, refresh, key])

  return { ...state, refresh }
}

function pillClass(variant: "ok" | "warn" | "bad" | "neutral") {
  switch (variant) {
    case "ok":
      return "border-primary/40 bg-primary/10 text-primary"
    case "warn":
      return "border-chart-4/40 bg-chart-4/10 text-chart-4"
    case "bad":
      return "border-destructive/40 bg-destructive/10 text-destructive"
    default:
      return "border-border/60 bg-muted/30 text-muted-foreground"
  }
}

function Metric({
  label,
  value,
  icon,
  hint,
}: {
  label: string
  value: React.ReactNode
  icon?: React.ReactNode
  hint?: string
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-card/50 px-4 py-3">
      <div className="space-y-1">
        <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">{label}</p>
        <div className="text-lg font-semibold tracking-tight">{value}</div>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {icon ? <div className="mt-1 text-muted-foreground">{icon}</div> : null}
    </div>
  )
}

function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
      <p className="font-medium text-foreground/90">{title}</p>
      {detail ? <p className="mt-1 text-xs leading-relaxed">{detail}</p> : null}
    </div>
  )
}

export function DashboardV2() {
  const baseUrl = getApiBaseUrl()

  const token = usePoller<TokenUsageData>(
    "token",
    `${baseUrl}/api/token-usage?hours=24`,
    {
      intervalMs: POLL_FAST_MS,
      transform: (data) => ({
        usedTokens: data?.usedTokens ?? 0,
        limitTokens: data?.limitTokens ?? 0,
        period: data?.period ?? "24h",
        updatedAt: data?.updatedAt ?? new Date().toISOString(),
        source: data?.source === "openclaw" ? "openclaw" : "stub",
        sourceDetail: data?.sourceDetail,
        breakdown: data?.breakdown ?? [],
        todo: data?.todo,
      }),
    },
  )

  const usageWindows = usePoller<UsageWindowsData>(
    "usageWindows",
    `${baseUrl}/api/usage-windows`,
    {
      intervalMs: POLL_FAST_MS,
      transform: (data): UsageWindowsData => {
        const fiveHourPer = data?.fiveHour?.perModel ?? data?.fiveHour?.perModel
        const weekPer = data?.weekly?.perModel ?? data?.weekly?.perModel
        const fiveTotals = summarizeUsageWindow(fiveHourPer)
        const weekTotals = summarizeUsageWindow(weekPer)
        const resetIn = Number(data?.fiveHour?.windowResetIn ?? 0)
        return {
          ...data,
          updatedAt: data?.updatedAt ?? new Date().toISOString(),
          fiveHour: {
            ...(data?.fiveHour ?? {}),
            perModel: fiveHourPer,
            totals: fiveTotals,
            windowResetInLabel: resetIn > 0 ? formatMsAsShort(resetIn) : "—",
          },
          weekly: {
            ...(data?.weekly ?? {}),
            perModel: weekPer,
            totals: weekTotals,
          },
        }
      },
    },
  )

  const rateLimits = usePoller<RateLimitEventsData>(
    "rateLimits",
    `${baseUrl}/api/rate-limit-events`,
    {
      intervalMs: POLL_FAST_MS,
      transform: (data) => data as RateLimitEventsData,
    },
  )

  const vps = usePoller<VpsStatusData>(
    "vps",
    `${baseUrl}/api/vps`,
    {
      intervalMs: POLL_FAST_MS,
      transform: (data) => ({
        status: data?.status ?? "unknown",
        region: data?.region ?? "n/a",
        uptimePercent: data?.uptimePercent ?? 0,
        cpuPercent: data?.cpuPercent ?? 0,
        ramPercent: data?.ramPercent ?? 0,
        diskPercent: data?.diskPercent ?? 0,
        updatedAt: data?.updatedAt ?? new Date().toISOString(),
        source: data?.source === "endpoint" ? "endpoint" : "stub",
        todo: data?.todo,
      }),
    },
  )

  const trends = usePoller<TrendsData>(
    "trends",
    `${baseUrl}/api/trends`,
    {
      intervalMs: POLL_SLOW_MS,
      transform: (data) => ({
        fetchedAt: data?.fetchedAt ?? new Date().toISOString(),
        updatedAt: data?.updatedAt ?? data?.fetchedAt ?? new Date().toISOString(),
        items: Array.isArray(data?.items) ? data.items : [],
        source: data?.source === "database" ? "database" : "stub",
        todo: data?.todo,
      }),
    },
  )

  const news = usePoller<NewsFeedData>(
    "news",
    `${baseUrl}/api/news`,
    {
      intervalMs: POLL_SLOW_MS,
      transform: (data) => ({
        updatedAt: data?.updatedAt ?? new Date().toISOString(),
        source: data?.source === "database" ? "database" : "stub",
        items: Array.isArray(data?.items)
          ? data.items.map((item: any) => ({
              title: item?.title ?? "",
              source: item?.source ?? "news",
              url: item?.url,
              publishedAt: item?.publishedAt ?? item?.published_at,
            }))
          : [],
        todo: data?.todo,
      }),
    },
  )

  const tokenData = token.data
  const vpsData = vps.data

  const tokenPercent = tokenData && tokenData.limitTokens > 0 ? Math.round((tokenData.usedTokens / tokenData.limitTokens) * 100) : null

  const vpsHealth: "ok" | "warn" | "bad" | "neutral" = !vpsData
    ? "neutral"
    : vpsData.status === "online"
      ? "ok"
      : vpsData.status === "degraded"
        ? "warn"
        : vpsData.status === "offline"
          ? "bad"
          : "neutral"

  const safeTrends = (trends.data?.items ?? []).filter((item) => {
    const title = String(item?.title ?? "")
    const lowered = title.toLowerCase()
    if (!title.trim()) return false
    if (lowered.includes("endpoint live") || lowered.includes("placeholder") || lowered.includes("replace with")) return false
    return true
  })

  const safeNews = (news.data?.items ?? []).filter((item) => {
    const title = String(item?.title ?? "")
    const lowered = title.toLowerCase()
    if (!title.trim()) return false
    if (lowered.includes("endpoint live") || lowered.includes("placeholder") || lowered.includes("replace with")) return false
    return true
  })

  const trendsStale = trends.data ? isStaleByTwoHours(trends.data.updatedAt) : true
  const newsStale = news.data ? isStaleByTwoHours(news.data.updatedAt) : true

  const refreshAll = () => {
    token.refresh()
    usageWindows.refresh()
    rateLimits.refresh()
    vps.refresh()
    trends.refresh()
    news.refresh()
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2">
            <Badge className={"rounded-full border px-2.5 py-1 " + pillClass("neutral")} variant="outline">
              BLUEPRINT v2
            </Badge>
            <Badge className={"rounded-full border px-2.5 py-1 " + pillClass(vpsHealth)} variant="outline">
              VPS {vpsData?.status ?? "…"}
            </Badge>
            {tokenData?.limitTokens ? (
              <Badge className={"rounded-full border px-2.5 py-1 " + pillClass(tokenPercent && tokenPercent >= 90 ? "bad" : "ok")} variant="outline">
                {tokenPercent ?? 0}% quota
              </Badge>
            ) : (
              <Badge className={"rounded-full border px-2.5 py-1 " + pillClass("neutral")} variant="outline">
                quota unknown
              </Badge>
            )}
          </div>

          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Command Dashboard
            <span className="ml-2 align-middle text-sm font-medium text-primary/90">cyber-minimal</span>
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            Live infrastructure + OpenClaw intelligence telemetry. Solid color system, bento layout, dark-first.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-full" onClick={refreshAll}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button asChild className="rounded-full">
            <a href="/logs" className="inline-flex items-center">
              View logs <ArrowUpRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </header>

      <section aria-label="dashboard-metrics" className="grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="md:col-span-4">
          {token.loading && !token.data ? (
            <Skeleton className="h-[86px] rounded-xl" />
          ) : token.error ? (
            <EmptyState title="Token usage unavailable" detail={token.error} />
          ) : (
            <Metric
              label="TOKENS (24H)"
              value={tokenData ? formatTokenUsage(tokenData) : "—"}
              icon={<Sparkles className="h-5 w-5" />}
              hint={tokenData ? `updated ${formatWibDateTime(tokenData.updatedAt)} WIB` : undefined}
            />
          )}
        </div>

        <div className="md:col-span-4">
          {vps.loading && !vps.data ? (
            <Skeleton className="h-[86px] rounded-xl" />
          ) : vps.error ? (
            <EmptyState title="VPS status unavailable" detail={vps.error} />
          ) : (
            <Metric
              label="VPS REGION"
              value={vpsData?.region ?? "—"}
              icon={<Zap className="h-5 w-5" />}
              hint={vpsData ? `${vpsData.cpuPercent}% CPU · ${vpsData.ramPercent}% RAM · ${vpsData.diskPercent}% disk` : undefined}
            />
          )}
        </div>

        <div className="md:col-span-4">
          {rateLimits.loading && !rateLimits.data ? (
            <Skeleton className="h-[86px] rounded-xl" />
          ) : rateLimits.error ? (
            <EmptyState title="Rate-limit scan unavailable" detail={rateLimits.error} />
          ) : (
            <Metric
              label="RATE LIMIT EVENTS (5H)"
              value={rateLimits.data ? String(rateLimits.data.events?.length ?? 0) : "—"}
              icon={<ShieldAlert className="h-5 w-5" />}
              hint={rateLimits.data ? `updated ${formatWibDateTime(rateLimits.data.updatedAt)} WIB` : undefined}
            />
          )}
        </div>
      </section>

      <section aria-label="dashboard-bento" className="grid grid-cols-1 gap-4 md:grid-cols-12">
        {/* Token usage */}
        <Card className="md:col-span-7 overflow-hidden border-border/70 bg-card/60">
          <CardHeader className="space-y-2">
            <CardDescription className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Token usage
              </span>
              <span className="text-xs text-muted-foreground">poll {Math.round(POLL_FAST_MS / 1000)}s</span>
            </CardDescription>
            <CardTitle className="text-2xl tracking-tight">
              {tokenData ? formatTokenUsage(tokenData) : token.loading ? "…" : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {token.error ? <EmptyState title="Token endpoint failed" detail={token.error} /> : null}

            <div className="space-y-2">
              <div className="h-2 rounded-full bg-muted/60 ring-1 ring-border/60">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${tokenPercent == null ? 18 : Math.min(tokenPercent, 100)}%` }}
                  aria-label="token-usage-progress"
                />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>
                  period: <span className="text-foreground/90">{tokenData?.period ?? "—"}</span>
                </span>
                <span>source: {tokenData?.sourceDetail ?? tokenData?.source ?? "—"}</span>
                <span>{tokenPercent == null ? "quota unknown" : `${tokenPercent}% used`}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <Card className="border-border/60 bg-muted/15">
                <CardHeader className="pb-3">
                  <CardDescription>Breakdown (24h)</CardDescription>
                  <CardTitle className="text-base">Provider / model</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {token.loading && !token.data ? (
                    <div className="space-y-2">
                      <Skeleton className="h-8" />
                      <Skeleton className="h-8" />
                      <Skeleton className="h-8" />
                    </div>
                  ) : tokenData?.breakdown?.length ? (
                    <ul className="space-y-2 text-xs">
                      {tokenData.breakdown.slice(0, 6).map((row) => (
                        <li
                          key={`${row.provider}:${row.model}`}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/40 px-3 py-2"
                        >
                          <span className="min-w-0 truncate text-muted-foreground">
                            {row.provider} <span className="text-foreground/85">/ {row.model}</span>
                          </span>
                          <span className="tabular-nums text-foreground">{formatCompactNumber(row.usedTokens)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <EmptyState title="No breakdown yet" detail="OpenClaw session logs did not include provider/model usage for this window." />
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-muted/15">
                <CardHeader className="pb-3">
                  <CardDescription>Usage windows</CardDescription>
                  <CardTitle className="text-base">5h vs 7d</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {usageWindows.loading && !usageWindows.data ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10" />
                      <Skeleton className="h-10" />
                    </div>
                  ) : usageWindows.error ? (
                    <EmptyState title="Usage windows unavailable" detail={usageWindows.error} />
                  ) : usageWindows.data ? (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-border/60 bg-card/40 px-3 py-2">
                          <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">5h output</p>
                          <p className="mt-0.5 text-sm font-semibold tabular-nums">
                            {formatCompactNumber(usageWindows.data.fiveHour?.totals?.output ?? 0)}
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">reset in {usageWindows.data.fiveHour?.windowResetInLabel ?? "—"}</p>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-card/40 px-3 py-2">
                          <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">7d output</p>
                          <p className="mt-0.5 text-sm font-semibold tabular-nums">
                            {formatCompactNumber(usageWindows.data.weekly?.totals?.output ?? 0)}
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">burn {usageWindows.data.burnRate?.tokensPerMinute ?? 0} tok/min</p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border/60 bg-card/40 px-3 py-2">
                        <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">Recent calls (5h)</p>
                        {usageWindows.data.fiveHour?.recentCalls?.length ? (
                          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                            {usageWindows.data.fiveHour.recentCalls.slice(0, 6).map((c) => (
                              <li key={c.timestamp + c.model} className="flex items-center justify-between gap-2">
                                <span className="min-w-0 truncate">{c.model}</span>
                                <span className="shrink-0 tabular-nums text-foreground/90">{formatCompactNumber(c.output)}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-xs text-muted-foreground">No calls in the last 5 hours.</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <EmptyState title="Usage windows not loaded" />
                  )}
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* VPS card */}
        <Card className="md:col-span-5 border-border/70 bg-card/60">
          <CardHeader>
            <CardDescription className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <Cpu className="h-4 w-4 text-muted-foreground" />
                VPS telemetry
              </span>
              <span className="text-xs text-muted-foreground">poll {Math.round(POLL_FAST_MS / 1000)}s</span>
            </CardDescription>
            <CardTitle className="text-xl">{vpsData ? `Status: ${vpsData.status}` : vps.loading ? "…" : "—"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {vps.error ? <EmptyState title="VPS endpoint failed" detail={vps.error} /> : null}

            {!vpsData && vps.loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : vpsData ? (
              <>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/40 px-4 py-3">
                    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <Cpu className="h-4 w-4" /> CPU
                    </div>
                    <div className="text-sm font-semibold tabular-nums">{vpsData.cpuPercent}%</div>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/40 px-4 py-3">
                    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <MemoryStick className="h-4 w-4" /> RAM
                    </div>
                    <div className="text-sm font-semibold tabular-nums">{vpsData.ramPercent}%</div>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/40 px-4 py-3">
                    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <HardDrive className="h-4 w-4" /> Disk
                    </div>
                    <div className="text-sm font-semibold tabular-nums">{vpsData.diskPercent}%</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">updated {formatWibDateTime(vpsData.updatedAt)} WIB</p>
              </>
            ) : (
              <EmptyState title="No VPS data" />
            )}
          </CardContent>
        </Card>

        {/* Trends */}
        <Card className="md:col-span-4 border-border/70 bg-card/60">
          <CardHeader>
            <CardDescription className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                X trends
              </span>
              <span className="text-xs text-muted-foreground">stale: {trendsStale ? "yes" : "no"}</span>
            </CardDescription>
            <CardTitle className="text-xl">Trend feed</CardTitle>
          </CardHeader>
          <CardContent>
            {trends.error ? <EmptyState title="Trends endpoint failed" detail={trends.error} /> : null}

            {trends.loading && !trends.data ? (
              <div className="space-y-2">
                <Skeleton className="h-9" />
                <Skeleton className="h-9" />
                <Skeleton className="h-9" />
              </div>
            ) : safeTrends.length ? (
              <ul className="space-y-2 text-sm">
                {safeTrends.slice(0, 6).map((item) => (
                  <li key={item.title} className="rounded-xl border border-border/60 bg-card/40 px-4 py-3 text-muted-foreground">
                    <div className="flex items-center justify-between gap-2">
                      <span className="line-clamp-2">{item.title}</span>
                      <span className="text-xs tabular-nums text-foreground/80">{item.score ?? 0}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No trends available" detail="Backend is returning placeholders or no ingested items yet." />
            )}

            {trends.data?.updatedAt ? (
              <p className="mt-3 text-xs text-muted-foreground">updated {formatWibDateTime(trends.data.updatedAt)} WIB</p>
            ) : null}
          </CardContent>
        </Card>

        {/* News */}
        <Card className="md:col-span-4 border-border/70 bg-card/60">
          <CardHeader>
            <CardDescription className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                News ingestion
              </span>
              <span className="text-xs text-muted-foreground">stale: {newsStale ? "yes" : "no"}</span>
            </CardDescription>
            <CardTitle className="text-xl">Latest headlines</CardTitle>
          </CardHeader>
          <CardContent>
            {news.error ? <EmptyState title="News endpoint failed" detail={news.error} /> : null}

            {news.loading && !news.data ? (
              <div className="space-y-2">
                <Skeleton className="h-9" />
                <Skeleton className="h-9" />
                <Skeleton className="h-9" />
              </div>
            ) : safeNews.length ? (
              <ul className="space-y-2 text-sm">
                {safeNews.slice(0, 5).map((item) => (
                  <li key={`${item.title}-${item.publishedAt ?? ""}`} className="rounded-xl border border-border/60 bg-card/40 px-4 py-3 text-muted-foreground">
                    <p className="line-clamp-2">{item.title}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No headlines available" detail="No ingested records in api_news yet." />
            )}

            {news.data?.updatedAt ? <p className="mt-3 text-xs text-muted-foreground">updated {formatWibDateTime(news.data.updatedAt)} WIB</p> : null}
          </CardContent>
        </Card>

        {/* Rate limit events */}
        <Card className="md:col-span-4 border-border/70 bg-card/60">
          <CardHeader>
            <CardDescription className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                Rate-limit events
              </span>
              <span className="text-xs text-muted-foreground">window: {rateLimits.data?.window ?? "5h"}</span>
            </CardDescription>
            <CardTitle className="text-xl">429 / overload</CardTitle>
          </CardHeader>
          <CardContent>
            {rateLimits.loading && !rateLimits.data ? (
              <div className="space-y-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : rateLimits.error ? (
              <EmptyState title="Rate-limit events unavailable" detail={rateLimits.error} />
            ) : rateLimits.data?.events?.length ? (
              <ScrollArea className="h-[240px] pr-2">
                <ul className="space-y-2 text-xs">
                  {rateLimits.data.events.slice(0, 20).map((ev) => (
                    <li key={ev.timestamp + ev.detail} className="rounded-xl border border-border/60 bg-card/40 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-muted-foreground">{ev.provider ? `${ev.provider}/${ev.model ?? ""}` : "unknown"}</span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {new Date(ev.timestamp).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" })}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-muted-foreground/90">{ev.detail}</p>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            ) : (
              <EmptyState title="No rate-limit events" detail="All clear in the last 5 hours." />
            )}
          </CardContent>
        </Card>
      </section>

      <footer className="flex flex-col gap-1 text-xs text-muted-foreground">
        <p>
          API base: <span className="text-foreground/80">{baseUrl}</span>
        </p>
        <p>All cards are solid-color (no gradients). Dark mode is the reference.</p>
      </footer>
    </div>
  )
}
