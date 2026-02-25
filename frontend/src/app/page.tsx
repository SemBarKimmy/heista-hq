import { TrelloBoard } from "@/components/TrelloBoard";
import { AgentMonitoring } from "@/components/AgentMonitoring";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card px-8 py-4">
        <h1 className="text-2xl font-bold text-primary">Heista HQ</h1>
      </header>
      <main className="grid grid-cols-1 gap-8 p-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-xl font-semibold text-secondary-foreground">Task Board</h2>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <TrelloBoard />
          </div>
        </div>
        <div>
          <h2 className="mb-4 text-xl font-semibold text-secondary-foreground">Agent Activity</h2>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <AgentMonitoring />
          </div>
        </div>
      </main>
    </div>
  );
}
