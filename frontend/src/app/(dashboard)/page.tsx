import { DashboardBento } from "@/components/DashboardBento"

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Command Dashboard</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Modern Web3 control center for infrastructure and intelligence monitoring.
        </p>
      </div>
      <DashboardBento />
    </div>
  )
}
