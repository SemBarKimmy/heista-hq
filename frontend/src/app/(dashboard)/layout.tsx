import { Sidebar } from "@/components/Sidebar"
import { ModeToggle } from "@/components/ModeToggle"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-end px-6 border-b border-border bg-card/50 backdrop-blur-sm">
          <ModeToggle />
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
