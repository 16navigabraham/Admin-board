import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import type React from "react"
import AuthGuard from "@/components/auth-guard"
import { ChainProvider } from "@/contexts/chain-context"
import { ChainSelector } from "@/components/chain-selector"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChainProvider>
      <SidebarProvider>
        <AppSidebar />

        {/* Mobile header: shows on small screens to allow toggling the sidebar */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b bg-background/80 p-2 backdrop-blur md:hidden">
          <SidebarTrigger />
          <ChainSelector />
        </header>

        {/* Desktop header for chain selector */}
        <div className="hidden md:block">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/80 px-6 py-3 backdrop-blur">
            <h2 className="text-lg font-semibold">Admin Dashboard</h2>
            <ChainSelector />
          </header>
        </div>

        <main className="flex flex-col flex-1 overflow-hidden">
          <AuthGuard>{children}</AuthGuard>
        </main>
      </SidebarProvider>
    </ChainProvider>
  )
}
