"use client"

import { CardDescription } from "@/components/ui/card"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Package, XCircle, CheckCircle, RefreshCw, Loader2 } from 'lucide-react'
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "@/config/contract"
import { createPublicClient, http, formatUnits } from "viem"
import { base } from "viem/chains"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, Line, LineChart, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts"

// Placeholder exchange rates - In a real app, fetch these from an API
// Assuming USDT/USDC are ~1 USD
const EXCHANGE_RATES = {
  USD_PER_STABLECOIN: 1, // Example: 1 USDT/USDC = 1 USD
  NGN_PER_USD: 1500, // Example: 1 USD = 1500 NGN
}

type Currency = "STABLE" | "USD" | "NGN"

interface DailyStats {
  date: string // ISO string from backend
  orderCount: number
  totalVolume: number // Already formatted number from backend
  successfulOrders: number
  failedOrders: number
  successRate: number
}

export default function DashboardOverviewPage() {
  const [totalVolume, setTotalVolume] = useState<string>("N/A")
  const [totalSuccessfulOrders, setTotalSuccessfulOrders] = useState<string>("N/A")
  const [totalFailedOrders, setTotalFailedOrders] = useState<string>("N/A")
  const [orderCounter, setOrderCounter] = useState<string>("N/A")
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [currentCurrency, setCurrentCurrency] = useState<Currency>("STABLE")
  const [rawTotalVolumeBigInt, setRawTotalVolumeBigInt] = useState<bigint | null>(null) // Keep for currency conversion
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [chartTimeframe, setChartTimeframe] = useState<string>("7d") // '7d', '30d', '24h', '1h'

  const fetchDashboardStats = async () => {
    setIsLoadingStats(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/stats`)
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard stats from backend")
      }
      const data = await response.json()

      // The backend returns totalVolume as a string representing a large number (likely wei)
      const volumeBigInt = BigInt(data.totalVolume)
      setRawTotalVolumeBigInt(volumeBigInt) // Store raw bigint for currency conversion
      setTotalVolume(formatUnits(volumeBigInt, 18)) // Format for display, assuming 18 decimals for contract volume
      setTotalSuccessfulOrders(data.successfulOrders.toString())
      setTotalFailedOrders(data.failedOrders.toString())
      setOrderCounter(data.orderCount.toString())
      toast.success("Dashboard stats updated!")
    } catch (error) {
      console.error("Error fetching dashboard stats:", error)
      toast.error("Failed to fetch dashboard stats.")
      setTotalVolume("N/A")
      setTotalSuccessfulOrders("N/A")
      setTotalFailedOrders("N/A")
      setOrderCounter("N/A")
    } finally {
      setIsLoadingStats(false)
    }
  }

  const fetchDailyStats = async (timeframe: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/stats/chart/${timeframe}`)
      if (!response.ok) {
        throw new Error("Failed to fetch daily stats from backend")
      }
      const data: { period: string; data: DailyStats[]; count: number } = await response.json()

      // Map backend data to match chart expectations
      const processedData = data.data.map((item) => ({
        ...item,
        date: new Date(item.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }), // Format date for display
        totalVolume: Number.parseFloat(formatUnits(BigInt(item.totalVolume), 18)), // Convert volume from string (wei) to number
      }))
      setDailyStats(processedData)
    } catch (error) {
      console.error("Error fetching daily stats:", error)
      toast.error("Failed to load chart data.")
      setDailyStats([])
    }
  }

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  useEffect(() => {
    fetchDailyStats(chartTimeframe)
  }, [chartTimeframe])

  useEffect(() => {
    if (rawTotalVolumeBigInt !== null) {
      let convertedValue: string
      // Convert raw bigint to a number using 18 decimals (for contract volume)
      const contractVolumeValue = Number.parseFloat(formatUnits(rawTotalVolumeBigInt, 18))

      switch (currentCurrency) {
        case "USD":
          // Assuming contract volume is in a stablecoin equivalent to USD
          convertedValue = (contractVolumeValue * EXCHANGE_RATES.USD_PER_STABLECOIN).toFixed(2)
          setTotalVolume(`$${convertedValue}`)
          break
        case "NGN":
          convertedValue = (contractVolumeValue * EXCHANGE_RATES.USD_PER_STABLECOIN * EXCHANGE_RATES.NGN_PER_USD).toFixed(2)
          setTotalVolume(`₦${convertedValue}`)
          break
        case "STABLE":
        default:
          setTotalVolume(contractVolumeValue.toFixed(2)) // Display contract volume with 2 decimals
          break
      }
    }
  }, [currentCurrency, rawTotalVolumeBigInt])

  const chartConfig = {
    totalVolume: {
      label: "Total Volume",
      color: "hsl(var(--chart-1))",
    },
    successfulOrders: {
      label: "Successful Orders",
      color: "hsl(var(--chart-2))",
    },
    failedOrders: {
      label: "Failed Orders",
      color: "hsl(var(--chart-3))",
    },
    orderCount: { // Changed from orderCounter to orderCount to match backend
      label: "Total Orders",
      color: "hsl(var(--chart-4))",
    },
  }

  return (
    <div className="flex-1 p-4 md:p-8 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Dashboard Overview</h1>
        <Button onClick={fetchDashboardStats} disabled={isLoadingStats} variant="outline" size="sm">
          {isLoadingStats ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {totalVolume}
              <Select value={currentCurrency} onValueChange={(value: Currency) => setCurrentCurrency(value)}>
                <SelectTrigger className="w-[80px] h-8 text-sm">
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STABLE">USDT/USDC</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="NGN">NGN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">Total value processed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful Orders</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSuccessfulOrders}</div>
            <p className="text-xs text-muted-foreground">Orders marked successful</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Orders</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFailedOrders}</div>
            <p className="text-xs text-muted-foreground">Orders marked failed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Order Counter</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderCounter}</div>
            <p className="text-xs text-muted-foreground">Total orders created</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Historical Data</h2>
        <div className="flex justify-end mb-4">
          <Select value={chartTimeframe} onValueChange={setChartTimeframe}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last 1 Hour</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Total Volume Over Time</CardTitle>
              <CardDescription>Volume of transactions over the selected period.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="aspect-video h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyStats}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      }
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis tickFormatter={(value) => `$${value.toFixed(0)}`} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      dataKey="totalVolume"
                      type="monotone"
                      stroke="var(--color-totalVolume)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Orders Over Time</CardTitle>
              <CardDescription>Successful vs. Failed orders daily.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="aspect-video h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyStats}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      }
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="successfulOrders" fill="var(--color-successfulOrders)" radius={4} />
                    <Bar dataKey="failedOrders" fill="var(--color-failedOrders)" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Total Orders Created</CardTitle>
              <CardDescription>Cumulative count of all orders created.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="aspect-video h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyStats}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      }
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      dataKey="orderCount" // Changed from orderCounter to orderCount
                      type="monotone"
                      stroke="var(--color-orderCount)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Note: Historical data for charts is now fetched from your backend API.
        </p>
      </div>
    </div>
  )
}
