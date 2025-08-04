"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAccount } from "wagmi"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function LandingPage() {
  const { isConnected, isConnecting } = useAccount()
  const router = useRouter()

  useEffect(() => {
    if (isConnected) {
      router.push("/dashboard/overview")
    }
  }, [isConnected, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Welcome to Paycrypt Admin Dashboard</CardTitle>
          <CardDescription className="mt-2 text-lg text-muted-foreground">
            Connect your wallet to manage your smart contract.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-4">
          {isConnecting ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Connecting...
            </div>
          ) : (
            <ConnectButton />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
