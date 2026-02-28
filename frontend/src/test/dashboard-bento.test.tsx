import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { DashboardBento } from "@/components/DashboardBento"
import React from "react"

describe("DashboardBento Component", () => {
  it("renders all required bento cards", () => {
    render(
      <DashboardBento
        tokenUsage={{ usedTokens: 1200, limitTokens: 8000, period: "24h", updatedAt: "2026-01-01T00:00:00.000Z", source: "openclaw" }}
        vpsStatus={{ status: "online", region: "sgp1", uptimePercent: 99.9, cpuPercent: 20, ramPercent: 40, diskPercent: 60, updatedAt: "2026-01-01T00:00:00.000Z", source: "endpoint" }}
        trends={{ fetchedAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", source: "database", items: [
          { title: "Open-source LLM infra", source: "news", score: 88 },
          { title: "#DevOps", source: "twitter", score: 77 },
        ] }}
      />,
    )

    expect(screen.getByText("AI Token Usage")).toBeDefined()
    expect(screen.getByText("VPS Status")).toBeDefined()
    expect(screen.getByText("News")).toBeDefined()
    expect(screen.getByText("Twitter Trends")).toBeDefined()
  })
})
