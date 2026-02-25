import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const tokenStats = {
  consumed: "12.4M",
  limit: "20M",
  percentage: 62,
}

const vpsStatus = [
  { label: "API Gateway", value: "Online", tone: "ok" },
  { label: "Worker Queue", value: "Healthy", tone: "ok" },
  { label: "Disk Usage", value: "71%", tone: "warn" },
]

const newsStub = [
  "Open-source LLM infra costs drop 18% this quarter.",
  "Vercel ships edge runtime improvements for observability.",
  "Supabase adds new database insights panel in beta.",
]

const trendsStub = ["#OpenSourceAI", "#TypeScript", "#DevOps", "#NextJS"]

export function DashboardBento() {
  return (
    <section aria-label="dashboard-bento" className="grid grid-cols-1 gap-4 md:grid-cols-6 md:grid-rows-4">
      <Card className="md:col-span-3 md:row-span-2">
        <CardHeader>
          <CardDescription>AI Token Usage</CardDescription>
          <CardTitle className="text-2xl">{tokenStats.consumed}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Monthly limit: {tokenStats.limit}</p>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary"
              style={{ width: `${tokenStats.percentage}%` }}
              aria-label="token-usage-progress"
            />
          </div>
          <p className="text-xs text-muted-foreground">{tokenStats.percentage}% used • Stub data</p>
        </CardContent>
      </Card>

      <Card className="md:col-span-3 md:row-span-2">
        <CardHeader>
          <CardDescription>VPS Status</CardDescription>
          <CardTitle>Infrastructure Health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {vpsStatus.map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <Badge variant={item.tone === "warn" ? "secondary" : "default"}>{item.value}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="md:col-span-4 md:row-span-2">
        <CardHeader>
          <CardDescription>News</CardDescription>
          <CardTitle>Industry Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            {newsStub.map((item) => (
              <li key={item} className="rounded-md border border-border px-3 py-2 text-muted-foreground">
                {item}
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
          {trendsStub.map((item) => (
            <Badge key={item} variant="outline" className="px-2 py-1 text-xs">
              {item}
            </Badge>
          ))}
          <p className="w-full pt-2 text-xs text-muted-foreground">Stub data • refresh tiap 2 jam</p>
        </CardContent>
      </Card>
    </section>
  )
}
