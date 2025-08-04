"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "@/config/contract"
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { Loader2 } from "lucide-react"
import { createPublicClient, http, type Address } from "viem"
import { base } from "viem/chains"

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
})

export default function ManageUsersPage() {
  const [userAddress, setUserAddress] = useState<string>("")
  const [isBlacklisted, setIsBlacklisted] = useState<boolean | null>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(false)

  const { data: hash, writeContract, isPending: isWriting, error: writeError } = useWriteContract()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  useEffect(() => {
    if (isConfirmed) {
      toast.success("Transaction confirmed!")
      // Optionally re-fetch status if the user address is the one being managed
      if (userAddress) {
        checkUserBlacklistStatus()
      }
    }
    if (writeError) {
      toast.error(`Transaction failed: ${writeError.message}`)
    }
  }, [isConfirmed, writeError])

  const checkUserBlacklistStatus = async () => {
    if (!userAddress) {
      toast.error("Please enter a user address.")
      return
    }
    setIsLoadingStatus(true)
    setIsBlacklisted(null)
    try {
      const status = (await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "isBlacklisted",
        args: [userAddress as Address],
      })) as boolean
      setIsBlacklisted(status)
      toast.success("User blacklist status fetched.")
    } catch (error: any) {
      console.error("Error checking blacklist status:", error)
      toast.error(`Failed to check status: ${error.message || error}`)
    } finally {
      setIsLoadingStatus(false)
    }
  }

  const handleAddToBlacklist = async () => {
    if (!userAddress) {
      toast.error("Please enter a user address.")
      return
    }
    try {
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "addToBlacklist",
        args: [userAddress as Address],
      })
      toast.info("Adding user to blacklist...")
    } catch (error: any) {
      console.error("Error adding to blacklist:", error)
      toast.error(`Failed to add to blacklist: ${error.message || error}`)
    }
  }

  const handleRemoveFromBlacklist = async () => {
    if (!userAddress) {
      toast.error("Please enter a user address.")
      return
    }
    try {
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "removeFromBlacklist",
        args: [userAddress as Address],
      })
      toast.info("Removing user from blacklist...")
    } catch (error: any) {
      console.error("Error removing from blacklist:", error)
      toast.error(`Failed to remove from blacklist: ${error.message || error}`)
    }
  }

  return (
    <div className="flex-1 p-4 md:p-8 overflow-auto">
      <h1 className="text-3xl font-bold mb-6">Manage Users</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>User Blacklist Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="user-address">User Address</Label>
              <Input
                id="user-address"
                placeholder="0x..."
                value={userAddress}
                onChange={(e) => setUserAddress(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button onClick={checkUserBlacklistStatus} disabled={isLoadingStatus}>
              {isLoadingStatus ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking...
                </>
              ) : (
                "Check Blacklist Status"
              )}
            </Button>
            {isBlacklisted !== null && (
              <div className="mt-2">
                <p>
                  <strong>Status:</strong>{" "}
                  <span className={`font-semibold ${isBlacklisted ? "text-red-500" : "text-green-500"}`}>
                    {isBlacklisted ? "Blacklisted" : "Not Blacklisted"}
                  </span>
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={handleAddToBlacklist} disabled={isWriting || isConfirming}>
                {isWriting && hash === undefined ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirming...
                  </>
                ) : isConfirming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                  </>
                ) : (
                  "Add to Blacklist"
                )}
              </Button>
              <Button onClick={handleRemoveFromBlacklist} variant="outline" disabled={isWriting || isConfirming}>
                {isWriting && hash === undefined ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirming...
                  </>
                ) : isConfirming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                  </>
                ) : (
                  "Remove from Blacklist"
                )}
              </Button>
            </div>
            {hash && (
              <div className="mt-2 text-sm text-muted-foreground">
                Transaction Hash:{" "}
                <a
                  href={`https://basescan.org/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {hash}
                </a>
              </div>
            )}
            {writeError && <div className="mt-2 text-sm text-red-500">Error: {writeError.message}</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
