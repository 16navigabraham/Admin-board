"use client"

import { CardDescription } from "@/components/ui/card"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Package, XCircle, CheckCircle, RefreshCw, Loader2, Network, Download, BarChart3 } from 'lucide-react'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, Line, LineChart, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts"
import { useChain } from "@/contexts/chain-context"
import { Badge } from "@/components/ui/badge"
import { exportDashboardStatsToExcel } from "@/lib/export-utils"

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
  volumeUSD: number
  volumeNGN: number
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
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null)
  const [isLoadingRates, setIsLoadingRates] = useState(false)
  const [chainBreakdown, setChainBreakdown] = useState<ChainBreakdown[]>([])
  const [showAllChains, setShowAllChains] = useState(true)

  const fetchExchangeRatesFromAPI = async () => {
    setIsLoadingRates(true)
    try {
      const response = await fetch('https://paycrypt-margin-price.onrender.com/api/v3/simple/price?ids=tether&vs_currencies=ngn,usd')
      if (response.ok) {
        const data = await response.json()
        if (data.tether) {
          setExchangeRates({
            usd: data.tether.usd,
            ngn: data.tether.ngn,
          })
          toast.success('Exchange rates updated!')
        }
      } else {
        toast.error('Failed to fetch exchange rates')
      }
    } catch (error) {
      console.warn('Failed to fetch exchange rates from API:', error)
      toast.error('Exchange rates API error')
    } finally {
      setIsLoadingRates(false)
    }
  }

  useEffect(() => {
    fetchExchangeRatesFromAPI()
  }, [])

  const fetchDashboardStats = async () => {
    setIsLoadingStats(true)
    try {
      let successfulOrders = 0
      let failedOrders = 0
      let orderCount = 0

      // Fetch stats from /api/stats endpoint - now returns aggregated data with chainStats
      try {
        const statsUrl = !showAllChains && chainConfig 
          ? `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/stats/${chainConfig.chainId}`
          : `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/stats`
        
        const statsResponse = await fetch(statsUrl)
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          console.log('📋 Raw stats data:', statsData)

          // Parse stats: API returns strings that need to be converted to numbers
          successfulOrders = statsData.successfulOrders 
            ? (typeof statsData.successfulOrders === 'string' ? parseInt(statsData.successfulOrders, 10) : statsData.successfulOrders)
            : 0
          failedOrders = statsData.failedOrders 
            ? (typeof statsData.failedOrders === 'string' ? parseInt(statsData.failedOrders, 10) : statsData.failedOrders)
            : 0
          orderCount = statsData.orderCount 
            ? (typeof statsData.orderCount === 'string' ? parseInt(statsData.orderCount, 10) : statsData.orderCount)
            : 0

          console.log('✅ Stats parsed successfully:', { orderCount, successfulOrders, failedOrders })
        } else {
          console.log('⚠️ Stats endpoint returned non-200 status:', statsResponse.status)
        }
      } catch (statsError) {
        console.log('⚠️ Stats endpoint error:', statsError)
      }

      // Always fetch volume data - it's the primary data source
      const volumeUrl = !showAllChains && chainConfig 
        ? `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/volume/latest?chainId=${chainConfig.chainId}`
        : `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/volume/latest`
      
      console.log('📥 Fetching volume from:', volumeUrl)
      
      const volumeResponse = await fetch(volumeUrl)

      if (!volumeResponse.ok) {
        throw new Error("Failed to fetch volume data")
      }

      const volumeData = await volumeResponse.json()
      console.log('📦 Full volume response:', volumeData)

      // Set stats - use parsed values or placeholder if unavailable
      setTotalSuccessfulOrders(successfulOrders > 0 ? successfulOrders.toLocaleString() : "0")
      setTotalFailedOrders(failedOrders > 0 ? failedOrders.toLocaleString() : "0")
      setOrderCounter(orderCount > 0 ? orderCount.toLocaleString() : "0")

      // Parse volume data: handles formatted strings with commas
      if (volumeData.success && volumeData.data) {
        console.log('📦 Volume data received:', volumeData.data)
        console.log('🔍 Chain mode:', { showAllChains, chainId: chainConfig?.chainId, chainName: chainConfig?.name })
        
        // Determine which volume to display based on view mode
        let displayVolumeUSD = 0
        let displayVolumeNGN = 0
        
        if (!showAllChains && chainConfig) {
          // Single chain mode: check if response has byChain array (all chains response) or is single chain data
          if (volumeData.data.byChain && Array.isArray(volumeData.data.byChain)) {
            // Response includes all chains - find the specific chain
            console.log('🔗 Searching for chain in byChain:', volumeData.data.byChain)
            const chainVolume = volumeData.data.byChain.find((c: any) => c.chainId === chainConfig.chainId)
            console.log('🎯 Found chain volume:', chainVolume)
            if (chainVolume) {
              displayVolumeUSD = parseFloat(chainVolume.volumeUSD.replace(/,/g, ''))
              displayVolumeNGN = parseFloat(chainVolume.volumeNGN.replace(/,/g, ''))
            } else {
              console.warn(`⚠️ Chain ${chainConfig.chainId} not found in byChain array`)
              // Fallback to total if chain not found
              displayVolumeUSD = parseFloat(volumeData.data.totalVolumeUSD.replace(/,/g, ''))
              displayVolumeNGN = parseFloat(volumeData.data.totalVolumeNGN.replace(/,/g, ''))
            }
          } else {
            // Response is single chain data (no byChain array) - use totalVolumeUSD/NGN directly
            console.log('🔗 Single chain response detected, using total volume directly')
            displayVolumeUSD = parseFloat(volumeData.data.totalVolumeUSD.replace(/,/g, ''))
            displayVolumeNGN = parseFloat(volumeData.data.totalVolumeNGN.replace(/,/g, ''))
          }
        } else {
          // All chains mode: use total volume
          displayVolumeUSD = parseFloat(volumeData.data.totalVolumeUSD.replace(/,/g, ''))
          displayVolumeNGN = parseFloat(volumeData.data.totalVolumeNGN.replace(/,/g, ''))
        }
        
        console.log('💰 Parsed volumes:', { displayVolumeUSD, displayVolumeNGN, mode: showAllChains ? 'all' : chainConfig?.name })
        
        // Store as bigint for currency conversion (6 decimals)
        setRawTotalVolumeBigInt(BigInt(Math.floor(displayVolumeUSD * 1000000)))
        
        // Update exchange rates from token data if available
        if (volumeData.data.tokens && volumeData.data.tokens.length > 0) {
          const avgPriceUSD = volumeData.data.tokens.reduce((sum: number, t: any) => sum + (t.priceUSD || 1), 0) / volumeData.data.tokens.length
          const avgPriceNGN = volumeData.data.tokens.reduce((sum: number, t: any) => sum + (t.priceNGN || 1500), 0) / volumeData.data.tokens.length
          
          // Only update if rates are not already fetched from API
          if (!exchangeRates) {
            setExchangeRates({
              usd: avgPriceUSD,
              ngn: avgPriceNGN
            })
          }
        }
        
        // Parse and set chain breakdown
        if (volumeData.data.byChain && Array.isArray(volumeData.data.byChain)) {
          const parsedBreakdown = volumeData.data.byChain.map((chain: any) => ({
            chainId: chain.chainId,
            volumeUSD: parseFloat(chain.volumeUSD.replace(/,/g, '')),
            volumeNGN: parseFloat(chain.volumeNGN.replace(/,/g, '')),
            tokenCount: chain.tokenCount
          }))
          setChainBreakdown(parsedBreakdown)
        }
        
        const chainInfo = showAllChains ? 'all chains' : chainConfig?.name || 'selected chain'
        console.log(`📊 Volume (${chainInfo}): $${displayVolumeUSD.toLocaleString('en-US', { maximumFractionDigits: 2 })} USD / ₦${displayVolumeNGN.toLocaleString('en-US', { maximumFractionDigits: 2 })} NGN`)
        console.log(`🪙 Tracking ${volumeData.data.tokenCount} tokens`)
        console.log(`📈 Stats: ${orderCount} total, ${successfulOrders} successful, ${failedOrders} failed`)
      }
      
      toast.success("Dashboard stats updated!")
    } catch (error) {
      console.error("Error fetching dashboard stats:", error)
      toast.error("Failed to fetch dashboard stats.")
      setTotalVolume("N/A")
      setTotalSuccessfulOrders("0")
      setTotalFailedOrders("0")
      setOrderCounter("0")
    } finally {
      setIsLoadingStats(false)
    }
  }

  const fetchDailyStats = async (timeframe: string) => {
    try {
      // Map frontend timeframe to API interval format
      const intervalMap: Record<string, string> = {
        "1h": "1h",
        "24h": "24h",
        "7d": "24h",
        "30d": "24h"
      }
      const interval = intervalMap[timeframe] || "24h"

      // Fetch volume chart data from Volume API - structure: { data: [...] }
      const volumeResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/volume/chart?interval=${interval}`
      )
      
      if (!volumeResponse.ok) {
        throw new Error("Failed to fetch volume chart data")
      }
      
      const volumeChartData = await volumeResponse.json()
      
      // Verify data array exists
      if (!volumeChartData.data || !Array.isArray(volumeChartData.data)) {
        throw new Error("Invalid volume chart response format")
      }

      // Fetch order stats chart data - structure: { data: [...] }
      const statsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/stats/chart/${timeframe}`
      )
      
      if (!statsResponse.ok) {
        throw new Error("Failed to fetch stats chart data")
      }
      
      const statsChartData = await statsResponse.json()
      
      // Verify data array exists
      if (!statsChartData.data || !Array.isArray(statsChartData.data)) {
        throw new Error("Invalid stats chart response format")
      }

      // Merge volume and stats data by timestamp
      const processedData: ProcessedDailyStats[] = volumeChartData.data.map((volumeItem: any) => {
        // Parse the formatted USD string to number (handles commas)
        const volumeUSD = parseFloat(volumeItem.totalVolumeUSD.replace(/,/g, ''))
        
        // Find matching stats data by timestamp (within 1 minute tolerance)
        const statsItem = statsChartData.data.find((s: any) => 
          Math.abs(new Date(s.timestamp).getTime() - new Date(volumeItem.timestamp).getTime()) < 60000
        ) || { successfulOrders: 0, failedOrders: 0, orderCount: 0, successRate: 0 }

        // Parse stats values if they're strings
        const successfulOrders = typeof statsItem.successfulOrders === 'string' 
          ? parseInt(statsItem.successfulOrders, 10) 
          : statsItem.successfulOrders || 0
        const failedOrders = typeof statsItem.failedOrders === 'string'
          ? parseInt(statsItem.failedOrders, 10)
          : statsItem.failedOrders || 0
        const orderCount = typeof statsItem.orderCount === 'string'
          ? parseInt(statsItem.orderCount, 10)
          : statsItem.orderCount || 0

        return {
          date: new Date(volumeItem.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          orderCount,
          totalVolume: volumeUSD,
          successfulOrders,
          failedOrders,
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
      console.log('📈 Chart data processed:', {
        dataPoints: uniqueData.length,
        volumePoints: volumeChartData.data.length,
        statsPoints: statsChartData.data.length
      })
    } catch (error) {
      console.error("Error fetching daily stats:", error)
      toast.error("Failed to load chart data.")
      setDailyStats([])
    }
  }

  useEffect(() => {
    console.log('🔄 Refetch triggered - Chain changed or view mode changed')
    fetchDashboardStats()
  }, [showAllChains, selectedChain, chainConfig?.chainId]) // Refetch when chain selection or view mode changes

  useEffect(() => {
    fetchDailyStats(chartTimeframe)
  }, [chartTimeframe])

  useEffect(() => {
    if (rawTotalVolumeBigInt !== null && exchangeRates) {
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
    } else if (rawTotalVolumeBigInt !== null && !exchangeRates) {
      // Show USD amount without conversion if rates not available
      const usdAmount = Number(rawTotalVolumeBigInt) / 1000000
      setTotalVolume(`$${usdAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
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

  const handleExportDashboardReport = async () => {
    try {
      // Build summary data
      const summaryData = [
        { metric: 'Report Date', value: new Date().toLocaleString() },
        { metric: 'View Mode', value: showAllChains ? 'All Chains' : (chainConfig?.name || 'Unknown') },
        { metric: 'Timeframe', value: chartTimeframe },
        { metric: 'Total Volume', value: totalVolume },
        { metric: 'Successful Orders', value: totalSuccessfulOrders },
        { metric: 'Failed Orders', value: totalFailedOrders },
        { metric: 'Order Counter', value: orderCounter },
        { metric: 'Exchange Rate (USD)', value: exchangeRates ? `$${exchangeRates.usd.toFixed(2)}` : 'N/A' },
        { metric: 'Exchange Rate (NGN)', value: exchangeRates ? `₦${exchangeRates.ngn.toFixed(2)}` : 'N/A' }
      ]

      const chainInfo = showAllChains ? 'all_chains' : (chainConfig?.name || 'unknown').toLowerCase()
      const filename = `dashboard_report_${chainInfo}_${chartTimeframe}_${new Date().toISOString().split('T')[0]}.xlsx`

      await exportDashboardStatsToExcel(summaryData, dailyStats, chainBreakdown, filename)
      toast.success('Dashboard report exported to Excel!')
    } catch (error: any) {
      console.error('Export error:', error)
      toast.error(`Failed to export report: ${error.message}`)
    }
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
              Refresh Stats
            </Button>
            <Button onClick={fetchExchangeRatesFromAPI} disabled={isLoadingRates} variant="outline" size="sm">
              {isLoadingRates ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh Rates
            </Button>
            <Button onClick={handleExportDashboardReport} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/analytics">
                <BarChart3 className="mr-2 h-4 w-4" />
                Detailed Analytics
              </Link>
            </Button>
          </div>
        </div>
        
        {showAllChains && chainBreakdown.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {chainBreakdown.map((chain) => {
              const chainName = chain.chainId === 8453 ? 'Base' : chain.chainId === 1135 ? 'Lisk' : chain.chainId === 42220 ? 'Celo' : 'Unknown'
              const chainIcon = chain.chainId === 8453 ? '🔵' : chain.chainId === 1135 ? '🟣' : chain.chainId === 42220 ? '🟡' : '⚪'
              
              // Format volume as number
              const volumeDisplay = chain.volumeUSD.toLocaleString('en-US', { maximumFractionDigits: 2 })
              
              return (
                <div key={chain.chainId} className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md text-sm">
                  <span>{chainIcon}</span>
                  <span className="font-medium">{chainName}:</span>
                  <span className="text-muted-foreground">${volumeDisplay}</span>
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

        {dailyStats.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center justify-center gap-2 h-64">
                <p className="text-muted-foreground">No chart data available</p>
                <p className="text-sm text-muted-foreground">Try refreshing or selecting a different timeframe</p>
              </div>
            </CardContent>
          </Card>
        ) : (
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
        )}
        
        <p className="text-sm text-muted-foreground mt-4">
          📊 Volume data from multi-chain aggregation (Base, Lisk, Celo) • Updated every 15 minutes • Real-time price conversion
        </p>
        <div className="text-xs text-muted-foreground mt-2 flex gap-4">
          <span>💱 Live Exchange Rates:</span>
          <span>1 USD = ${exchangeRates ? exchangeRates.usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--'}</span>
          <span>1 USD = ₦{exchangeRates ? exchangeRates.ngn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--'}</span>
        </div>
      </div>
    </div>
  )
}