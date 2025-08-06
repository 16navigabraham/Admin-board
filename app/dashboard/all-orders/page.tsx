"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Copy } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { formatUnits } from "viem" // Only need formatUnits for amount
import { Button } from "@/components/ui/button" // Import Button component

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
}

export default function AllOrdersPage() {
  const [allCreateOrders, setAllCreateOrders] = useState<Order[]>([])
  const [isFetchingOrders, setIsFetchingOrders] = useState(false)
  const [timeframe, setTimeframe] = useState<string>("all") // 'all', '24h', '7d'

  const fetchAllCreateOrders = async () => {
    setIsFetchingOrders(true)
    setAllCreateOrders([])
    try {
      let apiUrl = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/orders`
      if (timeframe !== "all") {
        apiUrl += `?range=${timeframe}`
      }

      const response = await fetch(apiUrl)
      if (!response.ok) {
        throw new Error("Failed to fetch all create orders from backend")
      }
      const data: { orders: Order[] } = await response.json()

      // Process data to format amount and timestamp for display
      const processedData = data.orders.map((order) => ({
        ...order,
        amount: formatUnits(BigInt(order.amount), 18), // Assuming 18 decimals for token amount
        timestamp: new Date(order.timestamp).toLocaleString(),
      }))

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

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.info(`${label} copied to clipboard.`)
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
              This data is now fetched from your backend API.
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
                    <TableHead>Order ID</TableHead>
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
                              href={`https://basescan.org/tx/${tx.txnHash}`}
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
                              href={`https://basescan.org/address/${tx.userWallet}`}
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
                              href={`https://basescan.org/token/${tx.tokenAddress}`}
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
            <p className="text-center text-muted-foreground">No create order transactions found for this timeframe.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
