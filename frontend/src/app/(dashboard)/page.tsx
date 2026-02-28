import { DashboardBento } from "@/components/DashboardBento"
import { getTokenUsage, getTrends, getVpsStatus } from "@/lib/dashboard"

export const revalidate = 7200

export default async function Home() {
  const [tokenUsage, vpsStatus, trends] = await Promise.all([
    getTokenUsage(),
    getVpsStatus(),
    getTrends(),
  ])

  const quickSummary = [
    `${tokenUsage.usedTokens.toLocaleString()} / ${tokenUsage.limitTokens.toLocaleString()} tokens used`,
    `VPS ${vpsStatus.status} • ${vpsStatus.cpuPercent}% CPU • ${vpsStatus.ramPercent}% RAM`,
    `${trends.items.length} intelligence feeds ready`,
  ]

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Command Dashboard</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          High-level overview for infrastructure and intelligence monitoring.
        </p>
      </div>

      <DashboardBento tokenUsage={tokenUsage} vpsStatus={vpsStatus} trends={trends} />

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="text-lg font-semibold tracking-tight">Quick Summary</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          {quickSummary.map((item) => (
            <li key={item} className="list-disc pl-1 ml-4">
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
