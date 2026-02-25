import { DashboardBento } from "@/components/DashboardBento"
import { TrelloBoard } from "@/components/TrelloBoard"
import { getTokenUsage, getTrends, getVpsStatus } from "@/lib/dashboard"

export const revalidate = 7200

export default async function Home() {
  const [tokenUsage, vpsStatus, trends] = await Promise.all([
    getTokenUsage(),
    getVpsStatus(),
    getTrends(),
  ])

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Command Dashboard</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Modern Web3 control center for infrastructure and intelligence monitoring.
        </p>
      </div>

      <DashboardBento tokenUsage={tokenUsage} vpsStatus={vpsStatus} trends={trends} />

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <TrelloBoard />
      </div>
    </div>
  )
}
