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

type Currency = "USDC" | "USD" | "NGN"

interface ExchangeRates {
  usd: number;
  ngn: number;
}

interface DailyStats {
  date: string
  orderCount: number
  totalVolume: number
  successfulOrders: number
  failedOrders: number
  successRate: number
  timestamp?: string
}

interface ProcessedDailyStats extends DailyStats {
  timestamp: string
}

export default function DashboardOverviewPage() {
  const [totalVolume, setTotalVolume] = useState<string>("N/A")
  const [totalSuccessfulOrders, setTotalSuccessfulOrders] = useState<string>("N/A")
  const [totalFailedOrders, setTotalFailedOrders] = useState<string>("N/A")
  const [orderCounter, setOrderCounter] = useState<string>("N/A")
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [currentCurrency, setCurrentCurrency] = useState<Currency>("USDC")
  const [rawTotalVolumeBigInt, setRawTotalVolumeBigInt] = useState<bigint | null>(null)
  const [dailyStats, setDailyStats] = useState<ProcessedDailyStats[]>([])
  const [chartTimeframe, setChartTimeframe] = useState<string>("7d")
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({
    usd: 1,
    ngn: 1500,
  })

  const fetchExchangeRates = async () => {
    try {
      // Fetch prices for USDT and USDC from your API
      const response = await fetch('https://paycrypt-margin-price.onrender.com/api/v3/simple/price?ids=tether,usd-coin&vs_currencies=usd,ngn')
      
      if (!response.ok) {
        throw new Error('Failed to fetch exchange rates')
      }
      
      const data = await response.json()
      
      // Extract rates - using USDT as primary reference
      const usdtRates = data.tether || data['tether'] || { usd: 1, ngn: 1500 }
      
      setExchangeRates({
        usd: usdtRates.usd || 1,
        ngn: usdtRates.ngn || 1500,
      })
      
      console.log('Exchange rates updated:', usdtRates)
      toast.success('Exchange rates updated successfully!')
    } catch (error) {
      console.error('Error fetching exchange rates:', error)
      toast.error('Failed to fetch latest exchange rates, using fallback rates')
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

      const volumeBigInt = BigInt(data.totalVolume)
      setRawTotalVolumeBigInt(volumeBigInt)
      
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
      const data: { period: string; data: any[]; count: number } = await response.json()

      // Process backend data
      const processedData: ProcessedDailyStats[] = data.data.map((item: any) => ({
        ...item,
        date: new Date(item.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        totalVolume: Number.parseFloat(formatUnits(BigInt(item.totalVolume), 6)),
        timestamp: item.timestamp
      }))

      // Remove duplicate dates by keeping the latest entry for each date
      const uniqueData: ProcessedDailyStats[] = []
      
      processedData.forEach((current) => {
        const existingIndex = uniqueData.findIndex(item => item.date === current.date)
        if (existingIndex >= 0) {
          if (new Date(current.timestamp) > new Date(uniqueData[existingIndex].timestamp)) {
            uniqueData[existingIndex] = current
          }
        } else {
          uniqueData.push(current)
        }
      })

      setDailyStats(uniqueData)
    } catch (error) {
      console.error("Error fetching daily stats:", error)
      toast.error("Failed to load chart data.")
      setDailyStats([])
    }
  }

  useEffect(() => {
    fetchExchangeRates()
    fetchDashboardStats()
  }, [])

  useEffect(() => {
    fetchDailyStats(chartTimeframe)
  }, [chartTimeframe])

  useEffect(() => {
    if (rawTotalVolumeBigInt !== null) {
      const usdcAmount = parseFloat(formatUnits(rawTotalVolumeBigInt, 6))
      
      let displayValue: string

      switch (currentCurrency) {
        case "USD":
          const usdValue = usdcAmount * exchangeRates.usd
          displayValue = `$${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          break
        case "NGN":
          const ngnValue = usdcAmount * exchangeRates.ngn
          displayValue = `₦${ngnValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          break
        case "USDC":
        default:
          displayValue = `${usdcAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`
          break
      }
      
      setTotalVolume(displayValue)
    }
  }, [currentCurrency, rawTotalVolumeBigInt, exchangeRates])

  const chartConfig = {
    totalVolume: {
      label: "Total Volume",
      color: "#3B82F6",
    },
    successfulOrders: {
      label: "Successful Orders",
      color: "#10B981",
    },
    failedOrders: {
      label: "Failed Orders", 
      color: "#EF4444",
    },
    orderCount: {
      label: "Total Orders",
      color: "#8B5CF6",
    },
  }

  return (
    <div className="flex-1 p-4 md:p-8 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Dashboard Overview</h1>
        <div className="flex gap-2">
          <Button onClick={fetchDashboardStats} disabled={isLoadingStats} variant="outline" size="sm">
            {isLoadingStats ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
          <Button onClick={fetchExchangeRates} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Update Rates
          </Button>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <div className="text-2xl font-bold break-words">
                {totalVolume}
              </div>
              <Select value={currentCurrency} onValueChange={(value: Currency) => setCurrentCurrency(value)}>
                <SelectTrigger className="w-full h-8 text-sm">
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USDC">USDC/USDT</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="NGN">NGN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Total value processed</p>
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
            <CardContent className="p-4">
              <ChartContainer config={chartConfig} className="aspect-video h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={dailyStats} 
                    margin={{ top: 20, right: 40, left: 40, bottom: 40 }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      tickFormatter={(value) => `$${value.toFixed(0)}`} 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                      width={70}
                      domain={['dataMin - 0.1', 'dataMax + 0.1']}
                    />
                    <ChartTooltip 
                      content={<ChartTooltipContent />}
                      formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Volume']}
                    />
                    <Line
                      dataKey="totalVolume"
                      type="monotone"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
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
            <CardContent className="p-4">
              <ChartContainer config={chartConfig} className="aspect-video h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={dailyStats} 
                    margin={{ top: 20, right: 40, left: 40, bottom: 40 }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                      width={50}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '15px' }} />
                    <Bar dataKey="successfulOrders" fill="#10B981" radius={4} />
                    <Bar dataKey="failedOrders" fill="#EF4444" radius={4} />
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
            <CardContent className="p-4">
              <ChartContainer config={chartConfig} className="aspect-video h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={dailyStats} 
                    margin={{ top: 20, right: 40, left: 40, bottom: 40 }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                      width={50}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      dataKey="orderCount"
                      type="monotone"
                      stroke="#8B5CF6"
                      strokeWidth={2}
                      dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#8B5CF6', strokeWidth: 2 }}
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
          <span>USDT/USD: ${exchangeRates.usd}</span>
          <span>USDT/NGN: ₦{exchangeRates.ngn.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}