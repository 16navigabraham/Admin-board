"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { Home, Package, Users, Settings, PanelLeft, Wallet, Moon, Sun, ListOrdered, LogOut, BarChart3 } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { paycryptAPI } from "@/lib/auth"
import { ChainSelector } from "@/components/chain-selector"

const menuItems = [
  {
    title: "Overview",
    href: "/dashboard/overview",
    icon: Home,
  },
  {
    title: "Order Tools",
    href: "/dashboard/orders",
    icon: Package,
  },
  {
    title: "All Create Orders",
    href: "/dashboard/all-orders",
    icon: ListOrdered,
  },
  {
    title: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
  },
  {
    title: "Manage Tokens",
    href: "/dashboard/tokens",
    icon: Wallet,
  },
  {
    title: "Manage Users",
    href: "/dashboard/users",
    icon: Users,
  },
  {
    title: "Admin Controls",
    href: "/dashboard/admin",
    icon: Settings,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { toggleSidebar } = useSidebar()
  const { theme, setTheme } = useTheme()

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center justify-between p-2">
          <Link href="/dashboard/overview" className="flex items-center gap-2 font-semibold">
            <PanelLeft className="h-6 w-6" />
            <span className="text-lg">Paycrypt Admin</span>
          </Link>
          <SidebarTrigger variant="ghost" size="icon" className="h-7 w-7" />
        </div>
        <div className="px-2 pb-2">
          <ChainSelector />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <ConnectButton />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  <span>Toggle Theme</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={async () => {
                    try {
                      await paycryptAPI.logout()
                    } catch (err) {
                      // ignore
                    }
                    // client-side redirect
                    if (typeof window !== 'undefined') {
                      window.location.replace('/')
                    }
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  )
}
