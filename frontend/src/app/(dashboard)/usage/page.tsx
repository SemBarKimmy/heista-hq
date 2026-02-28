import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getRateLimitEvents, getUsageWindows } from "@/lib/openclaw-usage"
import { formatWibDateTime } from "@/lib/dashboard"

export const revalidate = 0

function sortModels(perModel: Record<string, { output: number; input: number; cost: number; calls: number }>) {
  return Object.entries(perModel)
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => (b.output ?? 0) - (a.output ?? 0))
}

export default async function UsagePage() {
  const [usage, rateLimit] = await Promise.all([getUsageWindows(), getRateLimitEvents()])

  const perModel5h = usage.fiveHour?.perModel ?? {}
  const perModelWeek = usage.weekly?.perModel ?? {}

  const top5h = sortModels(perModel5h).slice(0, 12)
  const topWeek = sortModels(perModelWeek).slice(0, 12)

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">OpenClaw Usage</h1>
        <p className="text-sm text-muted-foreground sm:text-base">Aggregated per-provider/per-model usage from session .jsonl logs (no raw message content).</p>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="space-y-2">
            <CardDescription>Rolling window</CardDescription>
            <CardTitle className="text-xl">Last 5 hours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              updated {formatWibDateTime(usage.updatedAt)} WIB · burn {usage.burnRate?.tokensPerMinute ?? 0} tok/min · ${usage.burnRate?.costPerMinute ?? 0}/min
            </p>

            {usage.error ? <p className="text-xs text-destructive">{usage.error}</p> : null}

            <div className="space-y-2">
              {top5h.length ? (
                <ul className="space-y-2 text-xs">
                  {top5h.map((row) => (
                    <li key={row.key} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                      <span className="truncate text-muted-foreground">{row.key}</span>
                      <span className="tabular-nums text-foreground">{(row.output ?? 0).toLocaleString()} out · {(row.calls ?? 0).toLocaleString()} calls</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">No usage data in window.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-2">
            <CardDescription>Rolling window</CardDescription>
            <CardTitle className="text-xl">Last 7 days</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Top models by output tokens.</p>
            <div className="space-y-2">
              {topWeek.length ? (
                <ul className="space-y-2 text-xs">
                  {topWeek.map((row) => (
                    <li key={row.key} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                      <span className="truncate text-muted-foreground">{row.key}</span>
                      <span className="tabular-nums text-foreground">{(row.output ?? 0).toLocaleString()} out · {(row.calls ?? 0).toLocaleString()} calls</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">No usage data in window.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Recent calls</CardDescription>
            <CardTitle className="text-xl">Latest 20</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-xs">
              {(usage.fiveHour?.recentCalls ?? []).map((call) => (
                <li key={`${call.timestamp}:${call.model}:${call.output}`} className="rounded-md border border-border px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-muted-foreground">{call.model}</span>
                    <span className="text-muted-foreground">{call.ago}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    <span>in {call.input.toLocaleString()}</span>
                    <span>out {call.output.toLocaleString()}</span>
                    <span>calls cost ${call.cost}</span>
                  </div>
                </li>
              ))}
              {!(usage.fiveHour?.recentCalls ?? []).length ? <li className="text-xs text-muted-foreground">No recent calls.</li> : null}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Signals (best-effort)</CardDescription>
            <CardTitle className="text-xl">Rate limit events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Window: {rateLimit.window} · updated {formatWibDateTime(rateLimit.updatedAt)} WIB</p>
            <ul className="space-y-2 text-xs">
              {rateLimit.events.slice(0, 20).map((ev) => (
                <li key={`${ev.timestamp}:${ev.detail}`} className="rounded-md border border-border px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-muted-foreground">{ev.provider ? `${ev.provider}/${ev.model ?? ""}` : "unknown"}</span>
                    <span className="text-muted-foreground">{formatWibDateTime(ev.timestamp)} WIB</span>
                  </div>
                  <p className="mt-2 break-words text-[11px] text-muted-foreground">{ev.detail}</p>
                </li>
              ))}
              {!rateLimit.events.length ? <li className="text-xs text-muted-foreground">No rate limit signals detected.</li> : null}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
