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
import { createPublicClient, http, type Address, parseUnits } from "viem"
import { base } from "viem/chains"
import { Switch } from "@/components/ui/switch"

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
})

export default function AdminControlsPage() {
  const [adminAddress, setAdminAddress] = useState<string>("")
  const [isAdminStatus, setIsAdminStatus] = useState<boolean | null>(null)
  const [isLoadingAdminStatus, setIsLoadingAdminStatus] = useState(false)
  const [isPaused, setIsPaused] = useState<boolean | null>(null)
  const [isLoadingPauseStatus, setIsLoadingPauseStatus] = useState(false)
  const [emergencyWithdrawTokenAddress, setEmergencyWithdrawTokenAddress] = useState<string>("")
  const [emergencyWithdrawAmount, setEmergencyWithdrawAmount] = useState<string>("")

  const { data: hash, writeContract, isPending: isWriting, error: writeError } = useWriteContract()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  useEffect(() => {
    if (isConfirmed) {
      toast.success("Transaction confirmed!")
      // Refresh statuses after successful transaction
      if (adminAddress) checkAdminStatus()
      checkPauseStatus()
    }
    if (writeError) {
      toast.error(`Transaction failed: ${writeError.message}`)
    }
  }, [isConfirmed, writeError])

  useEffect(() => {
    checkPauseStatus()
  }, [])

  const checkAdminStatus = async () => {
    if (!adminAddress) {
      toast.error("Please enter an admin address.")
      return
    }
    setIsLoadingAdminStatus(true)
    setIsAdminStatus(null)
    try {
      const status = (await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "isAdmin",
        args: [adminAddress as Address],
      })) as boolean
      setIsAdminStatus(status)
      toast.success("Admin status fetched.")
    } catch (error: any) {
      console.error("Error checking admin status:", error)
      toast.error(`Failed to check status: ${error.message || error}`)
    } finally {
      setIsLoadingAdminStatus(false)
    }
  }

  const handleAddAdmin = async () => {
    if (!adminAddress) {
      toast.error("Please enter an admin address.")
      return
    }
    try {
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "addAdmin",
        args: [adminAddress as Address],
      })
      toast.info("Adding admin...")
    } catch (error: any) {
      console.error("Error adding admin:", error)
      toast.error(`Failed to add admin: ${error.message || error}`)
    }
  }

  const handleRemoveAdmin = async () => {
    if (!adminAddress) {
      toast.error("Please enter an admin address.")
      return
    }
    try {
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "removeAdmin",
        args: [adminAddress as Address],
      })
      toast.info("Removing admin...")
    } catch (error: any) {
      console.error("Error removing admin:", error)
      toast.error(`Failed to remove admin: ${error.message || error}`)
    }
  }

  const checkPauseStatus = async () => {
    setIsLoadingPauseStatus(true)
    try {
      const status = (await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "paused",
      })) as boolean
      setIsPaused(status)
      toast.success("Pause status fetched.")
    } catch (error: any) {
      console.error("Error checking pause status:", error)
      toast.error(`Failed to check pause status: ${error.message || error}`)
    } finally {
      setIsLoadingPauseStatus(false)
    }
  }

  const handleTogglePause = async () => {
    if (isPaused === null) {
      toast.error("Cannot toggle pause, status unknown.")
      return
    }
    try {
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: isPaused ? "unpause" : "pause",
      })
      toast.info(isPaused ? "Unpausing contract..." : "Pausing contract...")
    } catch (error: any) {
      console.error("Error toggling pause:", error)
      toast.error(`Failed to toggle pause: ${error.message || error}`)
    }
  }

  const handleEmergencyWithdraw = async () => {
    if (!emergencyWithdrawTokenAddress || !emergencyWithdrawAmount) {
      toast.error("Please enter token address and amount for withdrawal.")
      return
    }
    try {
      // Assuming 18 decimals for simplicity, or fetch token decimals if needed
      const parsedAmount = parseUnits(emergencyWithdrawAmount, 18)

      writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "emergencyWithdrawToken",
        args: [emergencyWithdrawTokenAddress as Address, parsedAmount],
      })
      toast.info("Initiating emergency withdrawal...")
    } catch (error: any) {
      console.error("Error during emergency withdrawal:", error)
      toast.error(`Emergency withdrawal failed: ${error.message || error}`)
    }
  }

  return (
    <div className="flex-1 p-4 md:p-8 overflow-auto">
      <h1 className="text-3xl font-bold mb-6">Admin Controls</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Admin Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="admin-address">Admin Address</Label>
              <Input
                id="admin-address"
                placeholder="0x..."
                value={adminAddress}
                onChange={(e) => setAdminAddress(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button onClick={checkAdminStatus} disabled={isLoadingAdminStatus}>
              {isLoadingAdminStatus ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking...
                </>
              ) : (
                "Check Admin Status"
              )}
            </Button>
            {isAdminStatus !== null && (
              <div className="mt-2">
                <p>
                  <strong>Status:</strong>{" "}
                  <span className={`font-semibold ${isAdminStatus ? "text-green-500" : "text-red-500"}`}>
                    {isAdminStatus ? "Is Admin" : "Not Admin"}
                  </span>
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={handleAddAdmin} disabled={isWriting || isConfirming}>
                {isWriting && hash === undefined ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirming...
                  </>
                ) : isConfirming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                  </>
                ) : (
                  "Add Admin"
                )}
              </Button>
              <Button onClick={handleRemoveAdmin} variant="outline" disabled={isWriting || isConfirming}>
                {isWriting && hash === undefined ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirming...
                  </>
                ) : isConfirming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                  </>
                ) : (
                  "Remove Admin"
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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Contract Pause Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <Button onClick={checkPauseStatus} disabled={isLoadingPauseStatus}>
              {isLoadingPauseStatus ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking...
                </>
              ) : (
                "Refresh Pause Status"
              )}
            </Button>
            {isPaused !== null && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="contract-pause"
                  checked={isPaused}
                  onCheckedChange={handleTogglePause}
                  disabled={isWriting || isConfirming}
                />
                <Label htmlFor="contract-pause">Contract is {isPaused ? "Paused" : "Unpaused"}</Label>
              </div>
            )}
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

      <Card>
        <CardHeader>
          <CardTitle>Emergency Withdrawal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="withdraw-token-address">Token Address</Label>
              <Input
                id="withdraw-token-address"
                placeholder="0x..."
                value={emergencyWithdrawTokenAddress}
                onChange={(e) => setEmergencyWithdrawTokenAddress(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="withdraw-amount">Amount (in token units)</Label>
              <Input
                id="withdraw-amount"
                placeholder="e.g., 100"
                value={emergencyWithdrawAmount}
                onChange={(e) => setEmergencyWithdrawAmount(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button onClick={handleEmergencyWithdraw} variant="destructive" disabled={isWriting || isConfirming}>
              {isWriting && hash === undefined ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirming...
                </>
              ) : isConfirming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                </>
              ) : (
                "Emergency Withdraw"
              )}
            </Button>
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
