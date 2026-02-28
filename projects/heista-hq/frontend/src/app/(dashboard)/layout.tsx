import { TopNav } from "@/components/TopNav"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav />
      <main className="flex-1 container mx-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  )
}
