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
import { Network } from "lucide-react"
import { Loader2, RefreshCw, Copy } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createPublicClient, http, formatUnits, parseUnits, type Address } from "viem"
import { base, celo } from "viem/chains"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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

interface SupportedToken {
  tokenAddress: Address
  orderLimit: bigint
  totalVolume: bigint
  successfulOrders: bigint
  failedOrders: bigint
  name: string
  decimals: number
  isActive: boolean
}

export default function ManageTokensPage() {
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

  const [newTokenAddress, setNewTokenAddress] = useState<string>("")
  const [newTokenName, setNewTokenName] = useState<string>("")
  const [newTokenDecimals, setNewTokenDecimals] = useState<number>(6) // Default to 6 for USDC/USDT
  const [tokenAddressToUpdate, setTokenAddressToUpdate] = useState<string>("")
  const [newLimit, setNewLimit] = useState<string>("")
  const [tokenAddressToToggle, setTokenAddressToToggle] = useState<string>("")
  const [tokenStatus, setTokenStatus] = useState<boolean>(false)
  const [supportedTokens, setSupportedTokens] = useState<SupportedToken[]>([])
  const [isLoadingTokens, setIsLoadingTokens] = useState(false)
  const [selectedTokenForLimit, setSelectedTokenForLimit] = useState<SupportedToken | null>(null)

  const { data: hash, writeContract, isPending: isWriting, error: writeError } = useWriteContract()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const { switchChain } = useSwitchChain()

  const fetchSupportedTokens = async () => {
    setIsLoadingTokens(true)
    try {
      const tokenAddresses = (await publicClient.readContract({
        address: contractAddress,
        abi: CONTRACT_ABI,
        functionName: "getSupportedTokens",
      })) as Address[]

      const tokenDetailsPromises = tokenAddresses.map(async (address) => {
        try {
          const details = (await publicClient.readContract({
            address: contractAddress,
            abi: CONTRACT_ABI,
            functionName: "getTokenDetails",
            args: [address],
          })) as SupportedToken

          return {
            ...details,
            decimals: Number(details.decimals), // Convert uint8 to number
          }
        } catch (error) {
          console.error(`Error fetching details for token ${address}:`, error)
          return null
        }
      })

      const resolvedTokens = (await Promise.all(tokenDetailsPromises)).filter(
        (token): token is SupportedToken => token !== null
      )
      setSupportedTokens(resolvedTokens)
      toast.success(`Loaded ${resolvedTokens.length} supported tokens`)
    } catch (error) {
      console.error("Error fetching supported tokens:", error)
      toast.error("Failed to fetch supported tokens.")
    } finally {
      setIsLoadingTokens(false)
    }
  }

  // Fetch token details when address is entered for limit update
  const fetchTokenDetailsForUpdate = async (address: string) => {
    if (!address || address.length < 42) {
      setSelectedTokenForLimit(null)
      return
    }

    try {
      const details = (await publicClient.readContract({
        address: contractAddress,
        abi: CONTRACT_ABI,
        functionName: "getTokenDetails",
        args: [address as Address],
      })) as SupportedToken

      const tokenInfo: SupportedToken = {
        ...details,
        decimals: Number(details.decimals), // Convert uint8 to number
      }

      setSelectedTokenForLimit(tokenInfo)
    } catch (error) {
      console.error("Error fetching token details:", error)
      setSelectedTokenForLimit(null)
      toast.error("Token not found or invalid address")
    }
  }

  useEffect(() => {
    if (!isChainLoading && contractAddress) {
      fetchSupportedTokens()
    }
  }, [selectedChain, contractAddress, isChainLoading])

  useEffect(() => {
    if (isConfirmed) {
      toast.success("Transaction confirmed!")
      fetchSupportedTokens() // Refresh list after successful transaction
      // Clear forms
      setNewTokenAddress("")
      setNewTokenName("")
      setNewTokenDecimals(6)
      setTokenAddressToUpdate("")
      setNewLimit("")
      setTokenAddressToToggle("")
      setTokenStatus(false)
      setSelectedTokenForLimit(null)
    }
    if (writeError) {
      toast.error(`Transaction failed: ${writeError.message}`)
    }
  }, [isConfirmed, writeError])

  // Debounce token address lookup
  useEffect(() => {
    const timer = setTimeout(() => {
      if (tokenAddressToUpdate) {
        fetchTokenDetailsForUpdate(tokenAddressToUpdate)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [tokenAddressToUpdate])

  const handleAddSupportedToken = async () => {
    if (!newTokenAddress || !newTokenName || newTokenDecimals === undefined) {
      toast.error("Please fill all fields for adding a token.")
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
        functionName: "addSupportedToken",
        args: [newTokenAddress as Address, newTokenName, newTokenDecimals],
        chainId: chainConfig?.chainId,
      })
      toast.info(`Adding supported token on ${chainConfig?.name}...`)
    } catch (error: any) {
      console.error("Error adding supported token:", error)
      toast.error(`Failed to add token: ${error.message || error}`)
    }
  }

  const handleUpdateOrderLimit = async () => {
    if (!tokenAddressToUpdate || !newLimit || !selectedTokenForLimit) {
      toast.error("Please enter a valid token address and limit.")
      return
    }
    
    try {
      // Switch to the correct chain first
      if (chainConfig?.chainId && switchChain) {
        await switchChain({ chainId: chainConfig.chainId })
      }
      
      // Parse the limit with the correct decimals for the selected token
      const parsedLimit = parseUnits(newLimit, selectedTokenForLimit.decimals)
      
      writeContract({
        address: contractAddress,
        abi: CONTRACT_ABI,
        functionName: "updateOrderLimit",
        args: [tokenAddressToUpdate as Address, parsedLimit],
        chainId: chainConfig?.chainId,
      })
      toast.info(`Updating order limit to ${newLimit} ${selectedTokenForLimit.name} on ${chainConfig?.name}...`)
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
      // Switch to the correct chain first
      if (chainConfig?.chainId && switchChain) {
        await switchChain({ chainId: chainConfig.chainId })
      }
      
      writeContract({
        address: contractAddress,
        abi: CONTRACT_ABI,
        functionName: "setTokenStatus",
        args: [tokenAddressToToggle as Address, tokenStatus],
        chainId: chainConfig?.chainId,
      })
      toast.info(`${tokenStatus ? "Activating" : "Deactivating"} token on ${chainConfig?.name}...`)
    } catch (error: any) {
      console.error("Error setting token status:", error)
      toast.error(`Failed to set token status: ${error.message || error}`)
    }
  }

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
    toast.info("Address copied to clipboard!")
  }

  const handleUseTokenAddress = (address: string, forUpdate: boolean = false) => {
    if (forUpdate) {
      setTokenAddressToUpdate(address)
    } else {
      setTokenAddressToToggle(address)
    }
  }

  return (
    <div className="flex-1 p-4 md:p-8 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Manage ERC20 Tokens</h1>
          {chainConfig && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Network className="h-3 w-3" />
              {chainConfig.name} Chain
            </Badge>
          )}
        </div>
        <Button onClick={fetchSupportedTokens} disabled={isLoadingTokens} variant="outline" size="sm">
          {isLoadingTokens ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add Supported ERC20 Token</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="new-token-address">Token Contract Address</Label>
              <Input
                id="new-token-address"
                placeholder="0x... (ERC20 contract address)"
                value={newTokenAddress}
                onChange={(e) => setNewTokenAddress(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="new-token-name">Token Symbol</Label>
              <Input
                id="new-token-name"
                placeholder="e.g., USDC, USDT, DAI"
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value.toUpperCase())}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="new-token-decimals">Token Decimals</Label>
              <Select value={newTokenDecimals.toString()} onValueChange={(value) => setNewTokenDecimals(Number(value))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select decimals" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 (USDC, USDT)</SelectItem>
                  <SelectItem value="18">18 (DAI, most ERC20s)</SelectItem>
                  <SelectItem value="8">8 (WBTC)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Most stablecoins use 6 decimals, standard ERC20s use 18 decimals
              </p>
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
                "Add ERC20 Token"
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
              <Label htmlFor="token-address-limit">Token Contract Address</Label>
              <Input
                id="token-address-limit"
                placeholder="0x... (paste ERC20 token address)"
                value={tokenAddressToUpdate}
                onChange={(e) => setTokenAddressToUpdate(e.target.value)}
                className="mt-1"
              />
              {selectedTokenForLimit && (
                <div className="mt-2 p-3 bg-muted rounded-md border">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-lg">{selectedTokenForLimit.name}</span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {selectedTokenForLimit.decimals} decimals
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      selectedTokenForLimit.isActive 
                        ? "bg-green-100 text-green-800" 
                        : "bg-red-100 text-red-800"
                    }`}>
                      {selectedTokenForLimit.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Current Limit:</strong> {formatUnits(selectedTokenForLimit.orderLimit, selectedTokenForLimit.decimals)} {selectedTokenForLimit.name}</p>
                      <p><strong>Total Volume:</strong> {formatUnits(selectedTokenForLimit.totalVolume, selectedTokenForLimit.decimals)} {selectedTokenForLimit.name}</p>
                    </div>
                    <div>
                      <p><strong>Successful Orders:</strong> {selectedTokenForLimit.successfulOrders.toString()}</p>
                      <p><strong>Failed Orders:</strong> {selectedTokenForLimit.failedOrders.toString()}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Raw limit: {selectedTokenForLimit.orderLimit.toString()} wei
                  </p>
                </div>
              )}
              {tokenAddressToUpdate && !selectedTokenForLimit && tokenAddressToUpdate.length >= 42 && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">⚠️ Token not found or invalid address</p>
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="new-limit">
                New Order Limit {selectedTokenForLimit && `(in ${selectedTokenForLimit.name})`}
              </Label>
              <Input
                id="new-limit"
                placeholder={`e.g., 50 ${selectedTokenForLimit?.name || "USDC"} (enter normal amount)`}
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                className="mt-1"
                type="number"
                step="0.000001"
              />
              {selectedTokenForLimit && newLimit && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-xs text-blue-700">
                    <strong>Will be stored as:</strong> {parseUnits(newLimit || "0", selectedTokenForLimit.decimals).toString()} wei
                  </p>
                  <p className="text-xs text-blue-600">
                    Example: 50 {selectedTokenForLimit.name} = {parseUnits("50", selectedTokenForLimit.decimals).toString()} wei ({selectedTokenForLimit.decimals} decimals)
                  </p>
                </div>
              )}
            </div>
            <Button onClick={handleUpdateOrderLimit} disabled={isWriting || isConfirming || !selectedTokenForLimit}>
              {isWriting && hash === undefined ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirming...
                </>
              ) : isConfirming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                </>
              ) : (
                "Update Order Limit"
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
              <Label htmlFor="token-address-status">Token Contract Address</Label>
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
              <Label htmlFor="token-status">{tokenStatus ? "Activate Token" : "Deactivate Token"}</Label>
            </div>
            <Button onClick={handleSetTokenStatus} disabled={isWriting || isConfirming || !tokenAddressToToggle}>
              {isWriting && hash === undefined ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirming...
                </>
              ) : isConfirming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                </>
              ) : (
                `${tokenStatus ? "Activate" : "Deactivate"} Token`
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Supported ERC20 Tokens</CardTitle>
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
                    <TableHead>Token</TableHead>
                    <TableHead>Contract Address</TableHead>
                    <TableHead>Order Limit</TableHead>
                    <TableHead>Volume & Orders</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TooltipProvider delayDuration={0}>
                    {supportedTokens.map((token) => (
                      <TableRow key={token.tokenAddress}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span className="font-semibold text-lg">{token.name}</span>
                            <span className="text-xs text-muted-foreground">{token.decimals} decimals</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <a
                              href={`${explorerUrl}/token/${token.tokenAddress}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline font-mono text-sm"
                            >
                              {token.tokenAddress.slice(0, 6)}...{token.tokenAddress.slice(-4)}
                            </a>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleCopyAddress(token.tokenAddress)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copy Address</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {formatUnits(token.orderLimit, token.decimals)} {token.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {token.orderLimit.toString()} wei
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-sm">
                            <span><strong>Volume:</strong> {formatUnits(token.totalVolume, token.decimals)} {token.name}</span>
                            <span className="text-green-600"><strong>Success:</strong> {token.successfulOrders.toString()}</span>
                            <span className="text-red-600"><strong>Failed:</strong> {token.failedOrders.toString()}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              token.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {token.isActive ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUseTokenAddress(token.tokenAddress, true)}
                                  className="text-xs"
                                >
                                  Update Limit
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Use this token for limit update</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUseTokenAddress(token.tokenAddress, false)}
                                  className="text-xs"
                                >
                                  Toggle Status
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Use this token for status toggle</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TooltipProvider>
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No ERC20 tokens configured yet.</p>
          )}
        </CardContent>
      </Card>

      {hash && (
        <div className="mt-4 p-4 bg-muted rounded-md">
          <p className="text-sm">
            <strong>Transaction Hash:</strong>{" "}
            <a
              href={`${explorerUrl}/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {hash}
            </a>
          </p>
        </div>
      )}
    </div>
  )
}