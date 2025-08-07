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

// Exchange rates for currency conversion
const EXCHANGE_RATES = {
  NGN_PER_USD: 1500, // 1 USD = 1500 NGN (adjust as needed)
}

type Currency = "USDC" | "USD" | "NGN"

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
  const [currentCurrency, setCurrentCurrency] = useState<Currency>("USDC")
  const [rawTotalVolumeBigInt, setRawTotalVolumeBigInt] = useState<bigint | null>(null) // Keep for currency conversion
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [chartTimeframe, setChartTimeframe] = useState<string>("7d") // '7d', '30d', '24h', '1h'
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(DEFAULT_EXCHANGE_RATES)

  const fetchExchangeRates = async () => {
    try {
      const response = await fetch('https://paycrypt-margin-price.onrender.com')
      if (!response.ok) {
        throw new Error('Failed to fetch exchange rates')
      }
      const data = await response.json()
      
      // Extract rates from your API response
      // Assuming your API returns rates for USDC, USDT, and NGN
      const rates: ExchangeRates = {
        NGN_PER_USD: data.rates?.NGN || data.NGN || DEFAULT_EXCHANGE_RATES.NGN_PER_USD,
        USD_PER_USDC: data.rates?.USDC || data.USDC || DEFAULT_EXCHANGE_RATES.USD_PER_USDC,
        USD_PER_USDT: data.rates?.USDT || data.USDT || DEFAULT_EXCHANGE_RATES.USD_PER_USDT,
      }
      
      setExchangeRates(rates)
      console.log('Exchange rates updated:', rates)
    } catch (error) {
      console.error('Error fetching exchange rates:', error)
      toast.error('Failed to fetch latest exchange rates, using fallback rates')
      // Keep using default rates on error
    }
  }

  const fetchDashboardStats = async () => {
    setIsLoadingStats(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/stats`)
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard stats from backend")
      }
      const data = await response.json()

      // The backend returns totalVolume as a string representing USDC/USDT (6 decimals)
      const volumeBigInt = BigInt(data.totalVolume)
      setRawTotalVolumeBigInt(volumeBigInt) // Store raw bigint for currency conversion
      
      // Format for display using 6 decimals for USDC/USDT
      const usdcAmount = parseFloat(formatUnits(volumeBigInt, 6))
      setTotalVolume(usdcAmount.toFixed(2))
      
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
        totalVolume: Number.parseFloat(formatUnits(BigInt(item.totalVolume), 6)), // Convert volume from string (6 decimals) to number
      }))
      setDailyStats(processedData)
    } catch (error) {
      console.error("Error fetching daily stats:", error)
      toast.error("Failed to load chart data.")
      setDailyStats([])
    }
  }

  useEffect(() => {
    // Fetch exchange rates first, then dashboard stats
    fetchExchangeRates()
    fetchDashboardStats()
  }, [])

  useEffect(() => {
    fetchDailyStats(chartTimeframe)
  }, [chartTimeframe])

  useEffect(() => {
    if (rawTotalVolumeBigInt !== null) {
      // Convert raw bigint to USDC/USDT amount using 6 decimals
      const usdcAmount = parseFloat(formatUnits(rawTotalVolumeBigInt, 6))
      
      let displayValue: string

      switch (currentCurrency) {
        case "USD":
          // Convert USDC/USDT to USD using live rates
          const usdValue = usdcAmount * exchangeRates.USD_PER_USDC // Assuming most volume is USDC
          displayValue = `${usdValue.toFixed(2)}`
          break
        case "NGN":
          // Convert to USD first, then to NGN using live rates
          const usdForNgn = usdcAmount * exchangeRates.USD_PER_USDC
          const ngnAmount = usdForNgn * exchangeRates.NGN_PER_USD
          displayValue = `₦${ngnAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          break
        case "USDC":
        default:
          // Display as USDC/USDT
          displayValue = `${usdcAmount.toFixed(2)} USDC/USDT`
          break
      }
      
      setTotalVolume(displayValue)
    }
  }, [currentCurrency, rawTotalVolumeBigInt, exchangeRates])

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
        <Button onClick={fetchExchangeRates} variant="outline" size="sm" className="ml-2">
          <RefreshCw className="mr-2 h-4 w-4" />
          Update Rates
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
                <SelectTrigger className="w-[90px] h-8 text-sm">
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USDC">USDC/USDT</SelectItem>
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
          Note: Historical data for charts is now fetched from your backend API. Exchange rates updated from live price feed.
        </p>
        <div className="text-xs text-muted-foreground mt-2 flex gap-4">
          <span>USD/USDC: ${exchangeRates.USD_PER_USDC}</span>
          <span>USD/USDT: ${exchangeRates.USD_PER_USDT}</span>
          <span>NGN/USD: ₦{exchangeRates.NGN_PER_USD.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}