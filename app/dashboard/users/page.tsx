"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { CONTRACT_ABI, getContractAddressByKey, getChainConfig } from "@/config/contract"
import { useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from "wagmi"
import { useChain } from "@/contexts/chain-context"
import { Badge } from "@/components/ui/badge"
import { Loader2, Network } from "lucide-react"
import { createPublicClient, http, type Address } from "viem"
import { base, celo } from "viem/chains"

// Lisk chain definition (not in viem by default)
const liskChain = {
  id: 1135,
  name: 'Lisk',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.api.lisk.com'] },
    public: { http: ['https://rpc.api.lisk.com'] },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://blockscout.lisk.com' },
  },
} as const

export default function ManageUsersPage() {
  const { selectedChain, chainConfig, isLoading: isChainLoading } = useChain()

  // Dynamic contract address based on selected chain
  const contractAddress = useMemo(() => {
    return getContractAddressByKey(selectedChain)
  }, [selectedChain])

  // Dynamic viem chain based on selected chain
  const viemChain = useMemo(() => {
    if (selectedChain === 'base') return base
    if (selectedChain === 'lisk') return liskChain
    if (selectedChain === 'celo') return celo
    return base
  }, [selectedChain])

  // Dynamic public client based on selected chain
  const publicClient = useMemo(() => {
    return createPublicClient({
      chain: viemChain,
      transport: http(chainConfig?.rpcUrl),
    })
  }, [viemChain, chainConfig?.rpcUrl])

  // Dynamic explorer URL
  const explorerUrl = useMemo(() => {
    return chainConfig?.explorer || 'https://basescan.org'
  }, [chainConfig])

  const [userAddress, setUserAddress] = useState<string>("")
  const [isBlacklisted, setIsBlacklisted] = useState<boolean | null>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(false)

  const { data: hash, writeContract, isPending: isWriting, error: writeError } = useWriteContract()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const { switchChain } = useSwitchChain()

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
        address: contractAddress,
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
      // Switch to the correct chain first
      if (chainConfig?.chainId && switchChain) {
        await switchChain({ chainId: chainConfig.chainId })
      }
      
      writeContract({
        address: contractAddress,
        abi: CONTRACT_ABI,
        functionName: "addToBlacklist",
        args: [userAddress as Address],
        chainId: chainConfig?.chainId,
      })
      toast.info(`Adding user to blacklist on ${chainConfig?.name}...`)
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
      // Switch to the correct chain first
      if (chainConfig?.chainId && switchChain) {
        await switchChain({ chainId: chainConfig.chainId })
      }
      
      writeContract({
        address: contractAddress,
        abi: CONTRACT_ABI,
        functionName: "removeFromBlacklist",
        args: [userAddress as Address],
        chainId: chainConfig?.chainId,
      })
      toast.info(`Removing user from blacklist on ${chainConfig?.name}...`)
    } catch (error: any) {
      console.error("Error removing from blacklist:", error)
      toast.error(`Failed to remove from blacklist: ${error.message || error}`)
    }
  }

  return (
    <div className="flex-1 p-4 md:p-8 overflow-auto">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-3xl font-bold">Manage Users</h1>
        {chainConfig && (
          <Badge variant="outline" className="flex items-center gap-1">
            <Network className="h-3 w-3" />
            {chainConfig.name} Chain
          </Badge>
        )}
      </div>

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
                  href={`${explorerUrl}/tx/${hash}`}
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
