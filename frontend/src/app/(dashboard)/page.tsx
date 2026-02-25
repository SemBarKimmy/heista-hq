import { TrelloBoard } from "@/components/TrelloBoard";

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Manage your tasks and monitor agent progress.</p>
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <TrelloBoard />
      </div>
    </div>
  );
}
