import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { AgentMonitoring } from "../components/AgentMonitoring"
import { AgentMonitoringBoard } from "../components/AgentMonitoringBoard"
import React from "react"

describe("AgentMonitoring Component", () => {
  it("should render monitoring header", () => {
    render(<AgentMonitoring />)
    expect(screen.getByText("Logs")).toBeDefined()
  })

  it("should render empty state by default", () => {
    render(<AgentMonitoring />)
    expect(screen.getByText("Waiting for logs...")).toBeDefined()
  })
})

describe("/monitor rendering", () => {
  it("renders agent cards with status, model, task, and reason", () => {
    render(
      <AgentMonitoringBoard
        agents={[
          {
            id: "a1",
            name: "Arga",
            state: "busy",
            model: "gpt-5.3-codex",
            currentTask: "Build monitor page",
            reason: "Assigned Iteration 8",
          },
        ]}
      />,
    )

    expect(screen.getByText("Arga")).toBeInTheDocument()
    expect(screen.getByText("BUSY")).toBeInTheDocument()
    expect(screen.getByText(/Model: gpt-5.3-codex/)).toBeInTheDocument()
    expect(screen.getByText("Build monitor page")).toBeInTheDocument()
    expect(screen.getByText("Assigned Iteration 8")).toBeInTheDocument()
  })

  it("renders empty state when no agent data", () => {
    render(<AgentMonitoringBoard agents={[]} />)
    expect(screen.getByText(/No monitoring data available/i)).toBeInTheDocument()
  })
})
