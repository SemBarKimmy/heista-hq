"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, LayoutDashboard, KanbanSquare, Radar, Logs, Settings } from "lucide-react"
import { useState } from "react"
import { ModeToggle } from "@/components/ModeToggle"
import { cn } from "@/lib/utils"

const routes = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Tasks", href: "/tasks", icon: KanbanSquare },
  { label: "Monitor", href: "/monitor", icon: Radar },
  { label: "Logs", href: "/logs", icon: Logs },
  { label: "Settings", href: "/settings", icon: Settings },
]

export function TopNav() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="sticky top-3 z-50 px-3 sm:px-6">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center rounded-2xl border border-border/80 bg-background/90 px-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-5">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-sm font-bold text-primary">
            H
          </div>
          <span className="font-semibold tracking-tight">Heista HQ</span>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              aria-current={pathname === route.href ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === route.href
                  ? "border border-border bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <route.icon className="h-4 w-4" />
              {route.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <ModeToggle />
          <button
            aria-label="Toggle menu"
            onClick={() => setIsOpen((prev) => !prev)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card md:hidden"
          >
            {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-40 bg-background/75 backdrop-blur-sm md:hidden" onClick={() => setIsOpen(false)}>
          <div
            className="absolute right-3 top-20 w-[min(22rem,calc(100%-1.5rem))] rounded-2xl border border-border bg-card p-3 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="flex flex-col gap-1">
              {routes.map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  onClick={() => setIsOpen(false)}
                  aria-current={pathname === route.href ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                    pathname === route.href
                      ? "border border-border bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <route.icon className="h-4 w-4" />
                  {route.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}
