"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAccount } from "wagmi" // Keep useAccount for potential future wallet connection checks, though not used for initial login
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Loader2 } from 'lucide-react'
import { toast } from "sonner"
import { paycryptAPI } from "@/lib/auth" // Import the API client

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { isConnected } = useAccount() // This hook is still available but not directly used for email/password login flow

  useEffect(() => {
    // Check if already authenticated via token in localStorage
    if (paycryptAPI.isAuthenticated()) {
      router.push("/dashboard/overview")
    }
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await paycryptAPI.login(email, password)
      toast.success("Login successful!")
      router.push("/dashboard/overview")
    } catch (err: any) {
      console.error("Login error:", err)
      setError(err.message || "Login failed. Please check your credentials.")
      toast.error(err.message || "Login failed.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Welcome to Paycrypt Admin Dashboard</CardTitle>
          <CardDescription className="mt-2 text-lg text-muted-foreground">
            Sign in to manage your smart contract.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-4">
          <form onSubmit={handleLogin} className="w-full space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
          <div className="text-sm text-muted-foreground">
            <a href="#" className="underline" onClick={() => toast.info("Forgot password functionality not yet implemented.")}>
              Forgot your password?
            </a>
          </div>
          {/* WalletConnect button is intentionally removed from the landing page */}
          {/* It will be available inside the dashboard after successful login */}
        </CardContent>
      </Card>
    </div>
  )
}
