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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createPublicClient, http, formatUnits, parseUnits, type Address } from "viem"
import { base } from "viem/chains"
import { Switch } from "@/components/ui/switch"

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
})

interface SupportedToken {
  tokenAddress: Address
  name: string
  decimals: number
  orderLimit: string
  isActive: boolean
}

export default function ManageTokensPage() {
  const [newTokenAddress, setNewTokenAddress] = useState<string>("")
  const [newTokenName, setNewTokenName] = useState<string>("")
  const [newTokenDecimals, setNewTokenDecimals] = useState<number>(18)
  const [tokenAddressToUpdate, setTokenAddressToUpdate] = useState<string>("")
  const [newLimit, setNewLimit] = useState<string>("")
  const [tokenAddressToToggle, setTokenAddressToToggle] = useState<string>("")
  const [tokenStatus, setTokenStatus] = useState<boolean>(false)
  const [supportedTokens, setSupportedTokens] = useState<SupportedToken[]>([])
  const [isLoadingTokens, setIsLoadingTokens] = useState(false)

  const { data: hash, writeContract, isPending: isWriting, error: writeError } = useWriteContract()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const fetchSupportedTokens = async () => {
    setIsLoadingTokens(true)
    try {
      const tokenAddresses = (await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "getSupportedTokens",
      })) as Address[]

      const tokenDetailsPromises = tokenAddresses.map(async (address) => {
        const details = (await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: "getTokenDetails",
          args: [address],
        })) as any // Adjust type based on actual return

        return {
          tokenAddress: details.tokenAddress,
          name: details.name,
          decimals: details.decimals,
          orderLimit: formatUnits(details.orderLimit, details.decimals),
          isActive: details.isActive,
        }
      })

      const resolvedTokens = await Promise.all(tokenDetailsPromises)
      setSupportedTokens(resolvedTokens)
    } catch (error) {
      console.error("Error fetching supported tokens:", error)
      toast.error("Failed to fetch supported tokens.")
    } finally {
      setIsLoadingTokens(false)
    }
  }

  useEffect(() => {
    fetchSupportedTokens()
  }, [])

  useEffect(() => {
    if (isConfirmed) {
      toast.success("Transaction confirmed!")
      fetchSupportedTokens() // Refresh list after successful transaction
    }
    if (writeError) {
      toast.error(`Transaction failed: ${writeError.message}`)
    }
  }, [isConfirmed, writeError])

  const handleAddSupportedToken = async () => {
    if (!newTokenAddress || !newTokenName || newTokenDecimals === undefined) {
      toast.error("Please fill all fields for adding a token.")
      return
    }
    try {
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "addSupportedToken",
        args: [newTokenAddress as Address, newTokenName, newTokenDecimals],
      })
      toast.info("Adding supported token...")
    } catch (error: any) {
      console.error("Error adding supported token:", error)
      toast.error(`Failed to add token: ${error.message || error}`)
    }
  }

  const handleUpdateOrderLimit = async () => {
    if (!tokenAddressToUpdate || !newLimit) {
      toast.error("Please fill all fields for updating order limit.")
      return
    }
    try {
      // Fetch token decimals to convert the limit correctly
      const tokenDetails = (await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "getTokenDetails",
        args: [tokenAddressToUpdate as Address],
      })) as any

      if (!tokenDetails) {
        toast.error("Token not found. Cannot update limit.")
        return
      }

      const parsedLimit = parseUnits(newLimit, tokenDetails.decimals)

      writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "updateOrderLimit",
        args: [tokenAddressToUpdate as Address, parsedLimit],
      })
      toast.info("Updating order limit...")
    } catch (error: any) {
      console.error("Error updating order limit:", error)
      toast.error(`Failed to update limit: ${error.message || error}`)
    }
  }

  const handleSetTokenStatus = async () => {
    if (!tokenAddressToToggle) {
      toast.error("Please enter token address to toggle status.")
      return
    }
    try {
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "setTokenStatus",
        args: [tokenAddressToToggle as Address, tokenStatus],
      })
      toast.info("Toggling token status...")
    } catch (error: any) {
      console.error("Error setting token status:", error)
      toast.error(`Failed to set token status: ${error.message || error}`)
    }
  }

  return (
    <div className="flex-1 p-4 md:p-8 overflow-auto">
      <h1 className="text-3xl font-bold mb-6">Manage Tokens</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add Supported Token</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="new-token-address">Token Address</Label>
              <Input
                id="new-token-address"
                placeholder="0x..."
                value={newTokenAddress}
                onChange={(e) => setNewTokenAddress(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="new-token-name">Token Name</Label>
              <Input
                id="new-token-name"
                placeholder="e.g., USDC"
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="new-token-decimals">Decimals</Label>
              <Input
                id="new-token-decimals"
                type="number"
                value={newTokenDecimals}
                onChange={(e) => setNewTokenDecimals(Number.parseInt(e.target.value))}
                className="mt-1"
              />
            </div>
            <Button onClick={handleAddSupportedToken} disabled={isWriting || isConfirming}>
              {isWriting && hash === undefined ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirming...
                </>
              ) : isConfirming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                </>
              ) : (
                "Add Token"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Update Token Order Limit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="token-address-limit">Token Address</Label>
              <Input
                id="token-address-limit"
                placeholder="0x..."
                value={tokenAddressToUpdate}
                onChange={(e) => setTokenAddressToUpdate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="new-limit">New Limit (in token units)</Label>
              <Input
                id="new-limit"
                placeholder="e.g., 1000"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button onClick={handleUpdateOrderLimit} disabled={isWriting || isConfirming}>
              {isWriting && hash === undefined ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirming...
                </>
              ) : isConfirming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                </>
              ) : (
                "Update Limit"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Set Token Status (Activate/Deactivate)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="token-address-status">Token Address</Label>
              <Input
                id="token-address-status"
                placeholder="0x..."
                value={tokenAddressToToggle}
                onChange={(e) => setTokenAddressToToggle(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="token-status" checked={tokenStatus} onCheckedChange={setTokenStatus} />
              <Label htmlFor="token-status">{tokenStatus ? "Active" : "Inactive"}</Label>
            </div>
            <Button onClick={handleSetTokenStatus} disabled={isWriting || isConfirming}>
              {isWriting && hash === undefined ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirming...
                </>
              ) : isConfirming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                </>
              ) : (
                "Set Status"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Supported Tokens</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingTokens ? (
            <div className="flex justify-center items-center h-24">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : supportedTokens.length > 0 ? (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Address</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Decimals</TableHead>
                    <TableHead>Order Limit</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supportedTokens.map((token) => (
                    <TableRow key={token.tokenAddress}>
                      <TableCell className="font-medium">
                        {token.tokenAddress.slice(0, 6)}...
                        {token.tokenAddress.slice(-4)}
                      </TableCell>
                      <TableCell>{token.name}</TableCell>
                      <TableCell>{token.decimals}</TableCell>
                      <TableCell>{token.orderLimit}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            token.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}
                        >
                          {token.isActive ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No supported tokens found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
