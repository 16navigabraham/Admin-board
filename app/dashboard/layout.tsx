import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import type React from "react"
import AuthGuard from "@/components/auth-guard"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />

      {/* Mobile header: shows on small screens to allow toggling the sidebar */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/80 p-2 backdrop-blur md:hidden">
        <SidebarTrigger />
        <h1 className="text-lg font-semibold">Dashboard</h1>
      </header>

      <main className="flex flex-col flex-1 overflow-hidden">
        <AuthGuard>{children}</AuthGuard>
      </main>
    </SidebarProvider>
  )
}
