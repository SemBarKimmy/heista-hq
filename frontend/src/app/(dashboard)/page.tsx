import { DashboardBento } from "@/components/DashboardBento"
import { TrelloBoard } from "@/components/TrelloBoard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatTokenUsage, getTokenUsage, getTrends, getVpsStatus, isStaleByTwoHours } from "@/lib/dashboard"

export const revalidate = 7200

export default async function Home() {
  const [tokenUsage, vpsStatus, trends] = await Promise.all([
    getTokenUsage(),
    getVpsStatus(),
    getTrends(),
  ])

  const stale = isStaleByTwoHours(trends.fetchedAt)

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Command Dashboard</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Modern Web3 control center for infrastructure and intelligence monitoring.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">AI Token Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{formatTokenUsage(tokenUsage)}</p>
            <p className="text-xs text-muted-foreground">Period: {tokenUsage.period} · source: {tokenUsage.source}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">VPS Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold uppercase">{vpsStatus.status}</p>
            <p className="text-xs text-muted-foreground">{vpsStatus.region} · uptime {vpsStatus.uptimePercent}% · source: {vpsStatus.source}</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">News + Twitter Trends</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">Server timestamp: {new Date(trends.fetchedAt).toLocaleString()} · stale: {stale ? "yes" : "no"} (2h policy)</p>
            <ul className="space-y-1 text-sm">
              {trends.items.slice(0, 3).map((item, index) => (
                <li key={`${item.title}-${index}`} className="flex items-center justify-between gap-3 rounded-md border border-border px-2 py-1">
                  <span>{item.title}</span>
                  <span className="text-xs text-muted-foreground">{item.source} · score {item.score}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <TrelloBoard />
      </div>

      <DashboardBento />
    </div>
  )
}
