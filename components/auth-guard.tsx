"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { paycryptAPI } from "@/lib/auth"

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Simple client-side auth check using the existing API helper
    const isAuth = paycryptAPI.isAuthenticated()
    if (!isAuth) {
      // Not authenticated -> redirect to landing/login page
      router.replace("/")
    } else {
      setChecking(false)
    }
  }, [router])

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}