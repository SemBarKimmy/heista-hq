import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { VpsStatusCard } from "@/components/VpsStatusCard"
import {
  formatTokenUsage,
  formatWibDateTime,
  isStaleByTwoHours,
  nextRefreshInLabel,
  type TokenUsageData,
  type TrendsData,
  type VpsStatusData,
} from "@/lib/dashboard"

interface DashboardBentoProps {
  tokenUsage: TokenUsageData
  vpsStatus: VpsStatusData
  trends: TrendsData
}

export function DashboardBento({ tokenUsage, vpsStatus, trends }: DashboardBentoProps) {
  const tokenPercent = tokenUsage.limitTokens > 0 ? Math.round((tokenUsage.usedTokens / tokenUsage.limitTokens) * 100) : 0
  const trendsStale = isStaleByTwoHours(trends.updatedAt)
  const newsItems = trends.items.filter((item) => item.source === "news").slice(0, 3)
  const twitterItems = trends.items.filter((item) => item.source === "twitter").slice(0, 6)

  const breakdown = (tokenUsage.breakdown ?? []).slice(0, 6)

  return (
    <section aria-label="dashboard-bento" className="grid grid-cols-1 gap-4 md:grid-cols-6 md:grid-rows-4">
      <Card className="md:col-span-3 md:row-span-2">
        <CardHeader className="space-y-2">
          <CardDescription>AI Token Usage</CardDescription>
          <CardTitle className="text-2xl tracking-tight">{formatTokenUsage(tokenUsage)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Period: {tokenUsage.period} · source: {tokenUsage.source}
            {tokenUsage.sourceDetail ? ` (${tokenUsage.sourceDetail})` : null}
          </p>

          <div className="space-y-2">
            <div className="h-2 rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${Math.min(tokenPercent, 100)}%` }}
                aria-label="token-usage-progress"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {tokenUsage.limitTokens > 0 ? `${tokenPercent}% used` : "limit unknown"} · updated {formatWibDateTime(tokenUsage.updatedAt)} WIB
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground">BY PROVIDER / MODEL</p>
            {breakdown.length ? (
              <ul className="space-y-2 text-xs">
                {breakdown.map((row) => (
                  <li key={`${row.provider}:${row.model}`} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <span className="truncate text-muted-foreground">
                      {row.provider} · <span className="text-foreground/90">{row.model}</span>
                    </span>
                    <span className="tabular-nums text-foreground">{row.usedTokens.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Unavailable: provider/model not present in OpenClaw logs.</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Quota remaining: unavailable (no provider API). See{" "}
              <a
                className="underline underline-offset-4 hover:text-foreground"
                href="https://github.com/SemBarKimmy/heista-hq/blob/develop/BLUEPRINT.md"
                target="_blank"
                rel="noreferrer"
              >
                docs
              </a>
              .
            </p>
          </div>
        </CardContent>
      </Card>

      <VpsStatusCard initialData={vpsStatus} />

      <Card className="md:col-span-4 md:row-span-2">
        <CardHeader>
          <CardDescription>News</CardDescription>
          <CardTitle>Industry Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            {(newsItems.length ? newsItems : trends.items.slice(0, 3)).map((item) => (
              <li key={item.title} className="rounded-md border border-border px-3 py-2 text-muted-foreground">
                {item.title}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 md:row-span-2">
        <CardHeader>
          <CardDescription>Twitter Trends</CardDescription>
          <CardTitle>Live Topics</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(twitterItems.length ? twitterItems : trends.items.slice(0, 6)).map((item) => (
            <Badge key={item.title} variant="outline" className="px-2 py-1 text-xs">
              {item.title}
            </Badge>
          ))}
          <p className="w-full pt-2 text-xs text-muted-foreground">
            updated {formatWibDateTime(trends.updatedAt)} WIB · stale: {trendsStale ? "yes" : "no"} · next refresh {nextRefreshInLabel(trends.updatedAt)}
          </p>
        </CardContent>
      </Card>
    </section>
  )
}
