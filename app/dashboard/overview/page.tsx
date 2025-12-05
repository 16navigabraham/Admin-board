"use client"

import { CardDescription } from "@/components/ui/card"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Package, XCircle, CheckCircle, RefreshCw, Loader2, Network } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, Line, LineChart, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts"
import { useChain } from "@/contexts/chain-context"
import { Badge } from "@/components/ui/badge"

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

interface ChainBreakdown {
  chainId: number
  volumeUSD: string
  volumeNGN: string
  tokenCount: number
}

export default function DashboardOverviewPage() {
  const { selectedChain, chainConfig } = useChain()
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
  const [chainBreakdown, setChainBreakdown] = useState<ChainBreakdown[]>([])
  const [showAllChains, setShowAllChains] = useState(true)

  const fetchExchangeRates = async () => {
    // Exchange rates are now provided by the Volume API
    // This function is kept for backward compatibility
    toast.info('Exchange rates are automatically updated with volume data')
  }

  const fetchDashboardStats = async () => {
    setIsLoadingStats(true)
    try {
      // Fetch order stats from existing endpoint
      const statsResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/stats`)
      if (!statsResponse.ok) {
        throw new Error("Failed to fetch dashboard stats from backend")
      }
      const statsData = await statsResponse.json()
      
      setTotalSuccessfulOrders(statsData.successfulOrders.toString())
      setTotalFailedOrders(statsData.failedOrders.toString())
      setOrderCounter(statsData.orderCount.toString())

      // Fetch volume data from Volume API
      // Build query params for chain filtering
      const volumeParams = new URLSearchParams()
      if (!showAllChains && chainConfig) {
        volumeParams.append('chainId', chainConfig.chainId.toString())
      }
      
      const volumeEndpoint = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/volume/latest${volumeParams.toString() ? '?' + volumeParams.toString() : ''}`
      
      const volumeResponse = await fetch(volumeEndpoint)
      if (!volumeResponse.ok) {
        throw new Error("Failed to fetch volume data from backend")
      }
      const volumeData = await volumeResponse.json()
      
      if (volumeData.success && volumeData.data) {
        const volumeUSD = parseFloat(volumeData.data.totalVolumeUSD.replace(/,/g, ''))
        const volumeNGN = parseFloat(volumeData.data.totalVolumeNGN.replace(/,/g, ''))
        
        setRawTotalVolumeBigInt(BigInt(Math.floor(volumeUSD * 1000000)))
        
        // Update exchange rates from API data
        if (volumeData.data.tokens && volumeData.data.tokens.length > 0) {
          const firstToken = volumeData.data.tokens[0]
          setExchangeRates({
            usd: firstToken.priceUSD || 1,
            ngn: firstToken.priceNGN || 1500
          })
        }
        
        // Update chain breakdown if available
        if (volumeData.data.byChain) {
          setChainBreakdown(volumeData.data.byChain)
        }
        
        const chainInfo = showAllChains ? 'all chains' : chainConfig?.name || 'selected chain'
        console.log(`📊 Volume (${chainInfo}): $${volumeData.data.totalVolumeUSD} USD / ₦${volumeData.data.totalVolumeNGN} NGN`)
        console.log(`🪙 Tracking ${volumeData.data.tokenCount} tokens`)
      }
      
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
      // Map frontend timeframe to API interval format
      const intervalMap: Record<string, string> = {
        "1h": "3h",
        "24h": "24h",
        "7d": "24h",
        "30d": "24h"
      }
      const interval = intervalMap[timeframe] || "24h"

      // Fetch volume chart data from new Volume API
      const volumeResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/volume/chart?interval=${interval}`
      )
      
      if (!volumeResponse.ok) {
        throw new Error("Failed to fetch volume chart data")
      }
      
      const volumeData = await volumeResponse.json()

      // Fetch order stats chart data
      const statsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/stats/chart/${timeframe}`
      )
      
      if (!statsResponse.ok) {
        throw new Error("Failed to fetch stats chart data")
      }
      
      const statsData = await statsResponse.json()

      // Merge volume and stats data by timestamp
      const processedData: ProcessedDailyStats[] = volumeData.data.map((volumeItem: any) => {
        // Parse the formatted USD string to number
        const volumeUSD = parseFloat(volumeItem.totalVolumeUSD.replace(/,/g, ''))
        
        // Find matching stats data by timestamp
        const statsItem = statsData.data.find((s: any) => 
          Math.abs(new Date(s.timestamp).getTime() - new Date(volumeItem.timestamp).getTime()) < 60000
        ) || { successfulOrders: 0, failedOrders: 0, orderCount: 0 }

        return {
          date: new Date(volumeItem.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          orderCount: statsItem.orderCount || 0,
          totalVolume: volumeUSD,
          successfulOrders: statsItem.successfulOrders || 0,
          failedOrders: statsItem.failedOrders || 0,
          successRate: statsItem.successRate || 0,
          timestamp: volumeItem.timestamp
        }
      })

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
      console.log('📈 Chart loaded:', volumeData.statistics)
      console.log('📊 Data points:', uniqueData.length)
    } catch (error) {
      console.error("Error fetching daily stats:", error)
      toast.error("Failed to load chart data.")
      setDailyStats([])
    }
  }

  useEffect(() => {
    fetchExchangeRates()
    fetchDashboardStats()
  }, [showAllChains, selectedChain]) // Refetch when chain selection or view mode changes

  useEffect(() => {
    fetchDailyStats(chartTimeframe)
  }, [chartTimeframe])

  useEffect(() => {
    if (rawTotalVolumeBigInt !== null) {
      // Convert from stored bigint (6 decimals) to USD amount
      const usdAmount = Number(rawTotalVolumeBigInt) / 1000000
      
      let displayValue: string

      switch (currentCurrency) {
        case "USD":
          const usdValue = usdAmount * exchangeRates.usd
          displayValue = `$${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          break
        case "NGN":
          const ngnValue = usdAmount * exchangeRates.ngn
          displayValue = `₦${ngnValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          break
        case "USDC":
        default:
          displayValue = `$${usdAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          break
      }
      
      setTotalVolume(displayValue)
    }
  }, [currentCurrency, rawTotalVolumeBigInt, exchangeRates])

  const chartConfig = {
    totalVolume: {
      label: "Total Volume (USD)",
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
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Dashboard Overview</h1>
            {!showAllChains && chainConfig && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Network className="h-3 w-3" />
                {chainConfig.name}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowAllChains(!showAllChains)} 
              variant={showAllChains ? "default" : "outline"} 
              size="sm"
            >
              <Network className="mr-2 h-4 w-4" />
              {showAllChains ? "All Chains" : "Single Chain"}
            </Button>
            <Button onClick={fetchDashboardStats} disabled={isLoadingStats} variant="outline" size="sm">
              {isLoadingStats ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </div>
        
        {showAllChains && chainBreakdown.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {chainBreakdown.map((chain) => {
              const chainName = chain.chainId === 8453 ? 'Base' : chain.chainId === 1135 ? 'Lisk' : 'Celo'
              const chainIcon = chain.chainId === 8453 ? '🔵' : chain.chainId === 1135 ? '🟣' : '🟡'
              return (
                <div key={chain.chainId} className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md text-sm">
                  <span>{chainIcon}</span>
                  <span className="font-medium">{chainName}:</span>
                  <span className="text-muted-foreground">${chain.volumeUSD}</span>
                </div>
              )
            })}
          </div>
        )}
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
                  <SelectItem value="USDC">USD (Default)</SelectItem>
                  <SelectItem value="USD">USD (Live Rate)</SelectItem>
                  <SelectItem value="NGN">NGN (Live Rate)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {showAllChains ? 'All tokens across Base, Lisk & Celo chains' : `${chainConfig?.name} chain only`}
            </p>
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
              <CardDescription>Trading volume across all supported tokens on Base, Lisk, and Celo chains (converted to USD).</CardDescription>
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
                      formatter={(value: any) => [`$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Total Volume']}
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
          📊 Volume data from multi-chain aggregation (Base, Lisk, Celo) • Updated every 15 minutes • Real-time price conversion
        </p>
        <div className="text-xs text-muted-foreground mt-2 flex gap-4">
          <span>💱 Live Rates:</span>
          <span>USD: ${exchangeRates.usd.toFixed(2)}</span>
          <span>NGN: ₦{exchangeRates.ngn.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}