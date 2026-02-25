import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  formatTokenUsage,
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

  return (
    <section aria-label="dashboard-bento" className="grid grid-cols-1 gap-4 md:grid-cols-6 md:grid-rows-4">
      <Card className="md:col-span-3 md:row-span-2">
        <CardHeader>
          <CardDescription>AI Token Usage</CardDescription>
          <CardTitle className="text-2xl">{formatTokenUsage(tokenUsage)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Period: {tokenUsage.period} · source: {tokenUsage.source}</p>
          <div className="h-2 rounded-full bg-muted">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(tokenPercent, 100)}%` }} aria-label="token-usage-progress" />
          </div>
          <p className="text-xs text-muted-foreground">
            {tokenPercent}% used · updated {new Date(tokenUsage.updatedAt).toLocaleString()}
          </p>
        </CardContent>
      </Card>

      <Card className="md:col-span-3 md:row-span-2">
        <CardHeader>
          <CardDescription>VPS Status</CardDescription>
          <CardTitle className="uppercase">{vpsStatus.status}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-3 gap-2">
            <Badge variant="outline">CPU {vpsStatus.cpuPercent}%</Badge>
            <Badge variant="outline">RAM {vpsStatus.ramPercent}%</Badge>
            <Badge variant="outline">Disk {vpsStatus.diskPercent}%</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {vpsStatus.region} · uptime {vpsStatus.uptimePercent}% · updated {new Date(vpsStatus.updatedAt).toLocaleString()} · source: {vpsStatus.source}
          </p>
        </CardContent>
      </Card>

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
            updated {new Date(trends.updatedAt).toLocaleString()} · stale: {trendsStale ? "yes" : "no"} · next refresh {nextRefreshInLabel(trends.updatedAt)}
          </p>
        </CardContent>
      </Card>
    </section>
  )
}
