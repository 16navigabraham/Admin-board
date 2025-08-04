"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Copy } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { decodeFunctionData, formatUnits } from "viem"
import { CONTRACT_ABI } from "@/config/contract"
import type { Hex } from "viem/types"

interface DecodedTxnData {
  functionName: string
  args: any[]
}

interface AllOrderHistoryItem {
  hash: string
  from: string
  to: string
  value: string
  timestamp: string
  decodedData?: DecodedTxnData
  actualOrderId?: string // Actual on-chain order ID from event decoding (simulated here)
  requestId?: string // Request ID from createOrder input (simulated here)
}

export default function AllOrdersPage() {
  const [allCreateOrders, setAllCreateOrders] = useState<AllOrderHistoryItem[]>([])
  const [isFetchingOrders, setIsFetchingOrders] = useState(false)
  const [timeframe, setTimeframe] = useState<string>("all") // 'all', '24h', '7d'

  const fetchAllCreateOrders = async () => {
    setIsFetchingOrders(true)
    setAllCreateOrders([])
    try {
      const response = await fetch("/api/all-create-orders")
      if (!response.ok) {
        throw new Error("Failed to fetch all create orders")
      }
      const rawData: AllOrderHistoryItem[] = await response.json()

      let filteredData = rawData
      const now = Date.now() / 1000 // Current timestamp in seconds

      if (timeframe === "24h") {
        filteredData = rawData.filter((tx) => now - Number.parseInt(tx.timestamp) <= 24 * 3600)
      } else if (timeframe === "7d") {
        filteredData = rawData.filter((tx) => now - Number.parseInt(tx.timestamp) <= 7 * 24 * 3600)
      }

      // Decode input data for display
      const processedData = filteredData.map((tx) => {
        let decoded: DecodedTxnData | undefined
        try {
          const { functionName, args } = decodeFunctionData({
            abi: CONTRACT_ABI,
            data: tx.input as Hex,
          })
          decoded = { functionName, args }
        } catch (e) {
          decoded = undefined
        }

        return {
          ...tx,
          value: formatUnits(BigInt(tx.value), 18), // Assuming ETH value for transaction value
          timestamp: new Date(Number.parseInt(tx.timestamp) * 1000).toLocaleString(),
          decodedData: decoded,
        }
      })

      setAllCreateOrders(processedData)
      toast.success("All create orders fetched successfully!")
    } catch (error: any) {
      console.error("Error fetching all create orders:", error)
      toast.error(`Failed to fetch all create orders: ${error.message || error}`)
    } finally {
      setIsFetchingOrders(false)
    }
  }

  useEffect(() => {
    fetchAllCreateOrders()
  }, [timeframe]) // Refetch when timeframe changes

  const handleCopyOrderId = (orderId: string) => {
    navigator.clipboard.writeText(orderId)
    toast.info(`Order ID ${orderId} copied to clipboard.`)
  }

  return (
    <div className="flex-1 p-4 md:p-8 overflow-auto">
      <h1 className="text-3xl font-bold mb-6">All Create Order Transactions</h1>

      <Card>
        <CardHeader>
          <CardTitle>Global Create Order History</CardTitle>
          <CardDescription>
            Displays all `createOrder` transactions on the contract.
            <br />
            <span className="text-sm text-muted-foreground">
              Note: This data is currently simulated. For production, a blockchain indexing solution (e.g., The Graph)
              is required to fetch all contract events efficiently.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-4">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
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
                    <TableHead>Actual Order ID</TableHead>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Hash</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Value (ETH)</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TooltipProvider delayDuration={0}>
                    {allCreateOrders.map((tx) => (
                      <TableRow key={tx.hash}>
                        <TableCell className="font-semibold">{tx.actualOrderId}</TableCell>
                        <TableCell className="font-mono text-xs">{tx.requestId?.slice(0, 10)}...</TableCell>
                        <TableCell className="font-medium">
                          <a
                            href={`https://basescan.org/tx/${tx.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            {tx.hash.slice(0, 6)}...{tx.hash.slice(-4)}
                          </a>
                        </TableCell>
                        <TableCell>
                          <a
                            href={`https://basescan.org/address/${tx.from}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                          </a>
                        </TableCell>
                        <TableCell>{tx.timestamp}</TableCell>
                        <TableCell>{tx.value}</TableCell>
                        <TableCell>
                          {tx.actualOrderId && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  className="h-8 w-8 bg-transparent border rounded"
                                  onClick={() => handleCopyOrderId(tx.actualOrderId!)}
                                >
                                  <Copy className="h-4 w-4" />
                                  <span className="sr-only">Copy Order ID</span>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>Copy Actual Order ID</TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TooltipProvider>
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No create order transactions found for this timeframe.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
