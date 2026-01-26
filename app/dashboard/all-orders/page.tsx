"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Copy, Network, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { formatUnits } from "viem"
import { Button } from "@/components/ui/button"
import { useChain } from "@/contexts/chain-context"
import { Badge } from "@/components/ui/badge"
import { getChainConfig } from "@/config/contract"
import { exportOrdersToExcel } from "@/lib/export-utils"

// Interface matching the backend's Order structure
interface Order {
  orderId: string
  requestId: string
  userWallet: string
  tokenAddress: string
  amount: string // This is a string representing a BigInt (wei)
  txnHash: string
  blockNumber: number
  timestamp: string // ISO string
  chainId: number // Chain ID (8453=Base, 1135=Lisk, 42220=Celo)
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  pages: number
}

export default function AllOrdersPage() {
  const { selectedChain, chainConfig } = useChain()
  const [allCreateOrders, setAllCreateOrders] = useState<Order[]>([])
  const [isFetchingOrders, setIsFetchingOrders] = useState(false)
  const [timeframe, setTimeframe] = useState<string>("24h") // '24h', '7d', '30d', etc.
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  })
  const [showAllChains, setShowAllChains] = useState(false)

  // Get explorer URL for a specific chain
  const getExplorerUrlForChain = (chainId: number): string => {
    const config = getChainConfig(chainId)
    return config?.explorer || 'https://basescan.org'
  }

  const getChainName = (chainId: number): string => {
    const config = getChainConfig(chainId)
    return config?.name || `Chain ${chainId}`
  }

  const getChainIcon = (chainId: number): string => {
    if (chainId === 8453) return '🔵' // Base
    if (chainId === 1135) return '🟣' // Lisk
    if (chainId === 42220) return '🟡' // Celo
    return '⚪' // Unknown
  }

  const fetchAllCreateOrders = async () => {
    setIsFetchingOrders(true)
    try {
      // Build query params
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        range: timeframe,
        sort: 'timestamp',
        order: 'desc'
      })

      // Add chain filter if not showing all chains
      if (!showAllChains && chainConfig) {
        params.append('chainId', chainConfig.chainId.toString())
      }

      const apiUrl = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/orders?${params}`

      const response = await fetch(apiUrl)
      if (!response.ok) {
        throw new Error("Failed to fetch orders from backend")
      }
      const data: { orders: Order[], pagination: PaginationInfo } = await response.json()

      // Process data to format amount and timestamp for display
      const processedData = data.orders.map((order) => ({
        ...order,
        amount: formatUnits(BigInt(order.amount), 18), // Assuming 18 decimals for token amount
        timestamp: new Date(order.timestamp).toLocaleString(),
      }))

      setAllCreateOrders(processedData)
      setPagination(data.pagination)
      
      const chainInfo = showAllChains ? 'all chains' : chainConfig?.name || 'selected chain'
      toast.success(`Fetched ${processedData.length} orders from ${chainInfo}!`)
    } catch (error: any) {
      console.error("Error fetching orders:", error)
      toast.error(`Failed to fetch orders: ${error.message || error}`)
      setAllCreateOrders([])
    } finally {
      setIsFetchingOrders(false)
    }
  }

  // Refetch when filters change (reset to page 1)
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [timeframe, showAllChains, selectedChain])

  // Fetch orders when pagination or filters change
  useEffect(() => {
    fetchAllCreateOrders()
  }, [pagination.page, timeframe, showAllChains, selectedChain])

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.info(`${label} copied to clipboard.`)
  }

  const handleExportToExcel = async () => {
    if (allCreateOrders.length === 0) {
      toast.error("No orders to export.")
      return
    }

    try {
      const exportData = allCreateOrders.map(order => ({
        orderId: order.orderId,
        requestId: order.requestId,
        userWallet: order.userWallet,
        tokenAddress: order.tokenAddress,
        amount: order.amount,
        txnHash: order.txnHash,
        timestamp: order.timestamp,
        chainId: order.chainId,
        chainName: getChainName(order.chainId)
      }))

      const chainInfo = showAllChains ? 'all_chains' : (chainConfig?.name || 'unknown').toLowerCase()
      const filename = `orders_${chainInfo}_${timeframe}_${new Date().toISOString().split('T')[0]}.xlsx`

      await exportOrdersToExcel(exportData, filename, 'Order History')
      toast.success(`Exported ${exportData.length} orders to Excel!`)
    } catch (error: any) {
      console.error('Export error:', error)
      toast.error(`Failed to export: ${error.message}`)
    }
  }

  return (
    <div className="flex-1 p-4 md:p-8 overflow-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">All Orders</h1>
          {!showAllChains && chainConfig && (
            <Badge variant="outline" className="flex items-center gap-1">
              <span>{getChainIcon(chainConfig.chainId)}</span>
              {chainConfig.name}
            </Badge>
          )}
        </div>
        <Button
          onClick={() => setShowAllChains(!showAllChains)}
          variant={showAllChains ? "default" : "outline"}
          size="sm"
          className="flex items-center gap-2"
        >
          <Network className="h-4 w-4" />
          {showAllChains ? "All Chains" : "Single Chain"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
          <CardDescription>
            {showAllChains 
              ? 'Displays orders across all chains (Base, Lisk, Celo)' 
              : `Displays orders on ${chainConfig?.name} chain only`
            }
            <br />
            <span className="text-sm text-muted-foreground">
              Showing {pagination.total.toLocaleString()} total orders • Page {pagination.page} of {pagination.pages}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end gap-3 mb-4">
            <Button
              onClick={handleExportToExcel}
              variant="outline"
              size="sm"
              disabled={allCreateOrders.length === 0 || isFetchingOrders}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export to Excel
            </Button>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12h">Last 12 Hours</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isFetchingOrders ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : allCreateOrders.length > 0 ? (
            <div className="mt-4 border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    {showAllChains && <TableHead>Chain</TableHead>}
                    <TableHead>Request ID</TableHead>
                    <TableHead>Txn Hash</TableHead>
                    <TableHead>User Wallet</TableHead>
                    <TableHead>Token Address</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TooltipProvider delayDuration={0}>
                    {allCreateOrders.map((tx) => (
                      <TableRow key={tx.txnHash}>
                        <TableCell className="font-semibold">{tx.orderId}</TableCell>
                        {showAllChains && (
                          <TableCell>
                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                              <span>{getChainIcon(tx.chainId)}</span>
                              <span className="text-xs">{getChainName(tx.chainId)}</span>
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell className="font-mono text-xs">
                          <div className="flex items-center gap-2">
                            {tx.requestId.slice(0, 10)}...
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleCopy(tx.requestId, "Request ID")}
                                >
                                  <Copy className="h-3 w-3" />
                                  <span className="sr-only">Copy Request ID</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copy Request ID</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <a
                              href={`${getExplorerUrlForChain(tx.chainId)}/tx/${tx.txnHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline"
                            >
                              {tx.txnHash.slice(0, 6)}...{tx.txnHash.slice(-4)}
                            </a>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleCopy(tx.txnHash, "Transaction Hash")}
                                >
                                  <Copy className="h-3 w-3" />
                                  <span className="sr-only">Copy Transaction Hash</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copy Transaction Hash</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <a
                              href={`${getExplorerUrlForChain(tx.chainId)}/address/${tx.userWallet}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline"
                            >
                              {tx.userWallet.slice(0, 6)}...{tx.userWallet.slice(-4)}
                            </a>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleCopy(tx.userWallet, "User Wallet")}
                                >
                                  <Copy className="h-3 w-3" />
                                  <span className="sr-only">Copy User Wallet</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copy User Wallet</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <a
                              href={`${getExplorerUrlForChain(tx.chainId)}/token/${tx.tokenAddress}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline"
                            >
                              {tx.tokenAddress.slice(0, 6)}...{tx.tokenAddress.slice(-4)}
                            </a>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleCopy(tx.tokenAddress, "Token Address")}
                                >
                                  <Copy className="h-3 w-3" />
                                  <span className="sr-only">Copy Token Address</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copy Token Address</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                        <TableCell>{tx.amount}</TableCell>
                        <TableCell>{tx.timestamp}</TableCell>
                        <TableCell>
                          {/* Add any specific actions for individual orders here if needed */}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TooltipProvider>
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No orders found for the selected filters.
            </p>
          )}
          
          {/* Pagination Controls */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} orders
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1 || isFetchingOrders}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="text-sm font-medium px-4">
                  Page {pagination.page} of {pagination.pages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= pagination.pages || isFetchingOrders}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
