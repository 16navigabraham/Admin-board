"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  Loader2,
  RefreshCw,
  Download,
  Users,
  Coins,
  Network,
  TrendingUp,
  BarChart3,
  PieChart,
  ChevronLeft,
  ChevronRight,
  Copy
} from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, Pie, PieChart as RechartsPieChart } from "recharts"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useChain } from "@/contexts/chain-context"
import {
  fetchComprehensiveSummary,
  fetchChainAnalytics,
  fetchTokenAnalytics,
  fetchUsersSummary,
  fetchTimelineAnalytics,
  getChainName,
  getChainIcon,
  formatVolume,
  formatNumber,
  type ComprehensiveSummaryResponse,
  type ChainAnalyticsResponse,
  type TokenAnalyticsResponse,
  type UsersSummaryResponse,
  type TimelineAnalyticsResponse
} from "@/lib/analytics-api"
import { exportDashboardStatsToExcel } from "@/lib/export-utils"
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

// Chart colors
const CHAIN_COLORS: Record<number, string> = {
  8453: '#3B82F6', // Base - Blue
  1135: '#8B5CF6', // Lisk - Purple
  42220: '#EAB308' // Celo - Yellow
}

export default function AnalyticsPage() {
  const { selectedChain, chainConfig } = useChain()
  const [timeframe, setTimeframe] = useState<string>("7d")
  const [isLoading, setIsLoading] = useState(false)
  const [showAllChains, setShowAllChains] = useState(true)

  // Data states
  const [summary, setSummary] = useState<ComprehensiveSummaryResponse | null>(null)
  const [chainAnalytics, setChainAnalytics] = useState<ChainAnalyticsResponse | null>(null)
  const [tokenAnalytics, setTokenAnalytics] = useState<TokenAnalyticsResponse | null>(null)
  const [usersSummary, setUsersSummary] = useState<UsersSummaryResponse | null>(null)
  const [timeline, setTimeline] = useState<TimelineAnalyticsResponse | null>(null)

  // Pagination for users
  const [usersPage, setUsersPage] = useState(1)
  const usersLimit = 20

  const fetchAllAnalytics = async () => {
    setIsLoading(true)
    try {
      const chainId = !showAllChains && chainConfig ? chainConfig.chainId : undefined

      // Fetch all analytics data in parallel
      const [summaryData, chainData, tokenData, usersData, timelineData] = await Promise.all([
        fetchComprehensiveSummary({ range: timeframe, chainId }),
        fetchChainAnalytics({ range: timeframe }),
        fetchTokenAnalytics({ range: timeframe, chainId }) as Promise<TokenAnalyticsResponse>,
        fetchUsersSummary({ range: timeframe, chainId, page: usersPage, limit: usersLimit }),
        fetchTimelineAnalytics({ range: timeframe, interval: 'day', chainId })
      ])

      setSummary(summaryData)
      setChainAnalytics(chainData as ChainAnalyticsResponse)
      setTokenAnalytics(tokenData)
      setUsersSummary(usersData)
      setTimeline(timelineData)

      toast.success("Analytics data refreshed!")
    } catch (error: any) {
      console.error("Error fetching analytics:", error)
      toast.error(`Failed to fetch analytics: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAllAnalytics()
  }, [timeframe, showAllChains, selectedChain, usersPage])

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.info(`${label} copied to clipboard.`)
  }

  const handleExportAnalytics = async () => {
    if (!summary) {
      toast.error("No analytics data to export.")
      return
    }

    try {
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'Paycrypt Admin Dashboard'
      workbook.created = new Date()

      // Helper to style header row
      const styleHeader = (sheet: ExcelJS.Worksheet) => {
        const headerRow = sheet.getRow(1)
        headerRow.font = { bold: true }
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
      }

      // Summary Sheet
      const summarySheet = workbook.addWorksheet('Summary')
      summarySheet.columns = [
        { header: 'Metric', key: 'metric', width: 20 },
        { header: 'Value', key: 'value', width: 30 }
      ]
      summarySheet.addRow({ metric: 'Report Date', value: new Date().toLocaleString() })
      summarySheet.addRow({ metric: 'Timeframe', value: timeframe })
      summarySheet.addRow({ metric: 'View Mode', value: showAllChains ? 'All Chains' : (chainConfig?.name || 'Unknown') })
      summarySheet.addRow({ metric: 'Total Orders', value: summary.summary.totalOrders })
      summarySheet.addRow({ metric: 'Total Volume (USD)', value: `$${summary.summary.totalVolume.toLocaleString()}` })
      summarySheet.addRow({ metric: 'Unique Users', value: summary.summary.uniqueUsers })
      summarySheet.addRow({ metric: 'Unique Tokens', value: summary.summary.uniqueTokens })
      summarySheet.addRow({ metric: 'Unique Chains', value: summary.summary.uniqueChains })
      summarySheet.addRow({ metric: 'Average Amount', value: `$${summary.summary.averageAmount.toFixed(2)}` })
      styleHeader(summarySheet)

      // Chain Breakdown Sheet
      if (summary.chainBreakdown.length > 0) {
        const chainSheet = workbook.addWorksheet('Chain Breakdown')
        chainSheet.columns = [
          { header: 'Chain', key: 'chain', width: 12 },
          { header: 'Order Count', key: 'orderCount', width: 15 },
          { header: 'Total Volume (USD)', key: 'volume', width: 20 },
          { header: 'Percentage of Total', key: 'percentage', width: 20 }
        ]
        summary.chainBreakdown.forEach(chain => {
          chainSheet.addRow({
            chain: chain.chainName,
            orderCount: chain.orderCount,
            volume: `$${chain.totalVolume.toLocaleString()}`,
            percentage: `${chain.percentageOfTotal}%`
          })
        })
        styleHeader(chainSheet)
      }

      // Top Tokens Sheet
      if (summary.topTokens.length > 0) {
        const tokensSheet = workbook.addWorksheet('Top Tokens')
        tokensSheet.columns = [
          { header: 'Token Address', key: 'address', width: 45 },
          { header: 'Order Count', key: 'orderCount', width: 15 },
          { header: 'Total Volume (USD)', key: 'volume', width: 20 },
          { header: 'Percentage of Total', key: 'percentage', width: 20 }
        ]
        summary.topTokens.forEach(token => {
          tokensSheet.addRow({
            address: token.tokenAddress,
            orderCount: token.orderCount,
            volume: `$${token.totalVolume.toLocaleString()}`,
            percentage: `${token.percentageOfTotal}%`
          })
        })
        styleHeader(tokensSheet)
      }

      // Top Users Sheet
      if (summary.topUsers.length > 0) {
        const usersSheet = workbook.addWorksheet('Top Users')
        usersSheet.columns = [
          { header: 'Wallet Address', key: 'wallet', width: 45 },
          { header: 'Order Count', key: 'orderCount', width: 15 },
          { header: 'Total Volume (USD)', key: 'volume', width: 20 },
          { header: 'Percentage of Total', key: 'percentage', width: 20 }
        ]
        summary.topUsers.forEach(user => {
          usersSheet.addRow({
            wallet: user.userWallet,
            orderCount: user.orderCount,
            volume: `$${user.totalVolume.toLocaleString()}`,
            percentage: `${user.percentageOfTotal}%`
          })
        })
        styleHeader(usersSheet)
      }

      // Timeline Data Sheet
      if (timeline && timeline.timeline.length > 0) {
        const timelineSheet = workbook.addWorksheet('Timeline Data')
        timelineSheet.columns = [
          { header: 'Date', key: 'date', width: 15 },
          { header: 'Order Count', key: 'orderCount', width: 15 },
          { header: 'Total Volume (USD)', key: 'volume', width: 20 },
          { header: 'Unique Users', key: 'users', width: 15 },
          { header: 'Unique Tokens', key: 'tokens', width: 15 },
          { header: 'Average Amount', key: 'average', width: 18 }
        ]
        timeline.timeline.forEach(point => {
          timelineSheet.addRow({
            date: new Date(point.timestamp).toLocaleDateString(),
            orderCount: point.orderCount,
            volume: `$${point.totalVolume.toLocaleString()}`,
            users: point.uniqueUsers,
            tokens: point.uniqueTokens,
            average: `$${point.averageAmount.toFixed(2)}`
          })
        })
        styleHeader(timelineSheet)
      }

      // All Users Sheet
      if (usersSummary && usersSummary.users.length > 0) {
        const allUsersSheet = workbook.addWorksheet('All Users')
        allUsersSheet.columns = [
          { header: 'Wallet Address', key: 'wallet', width: 45 },
          { header: 'Order Count', key: 'orderCount', width: 15 },
          { header: 'Total Volume (USD)', key: 'volume', width: 20 }
        ]
        usersSummary.users.forEach(user => {
          allUsersSheet.addRow({
            wallet: user.userWallet,
            orderCount: user.orderCount,
            volume: `$${user.totalVolume.toLocaleString()}`
          })
        })
        styleHeader(allUsersSheet)
      }

      const chainInfo = showAllChains ? 'all_chains' : (chainConfig?.name || 'unknown').toLowerCase()
      const filename = `analytics_report_${chainInfo}_${timeframe}_${new Date().toISOString().split('T')[0]}.xlsx`

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      saveAs(blob, filename)
      toast.success('Analytics report exported to Excel!')
    } catch (error: any) {
      console.error('Export error:', error)
      toast.error(`Failed to export report: ${error.message}`)
    }
  }

  const chartConfig = {
    orderCount: { label: "Orders", color: "#3B82F6" },
    totalVolume: { label: "Volume (USD)", color: "#10B981" },
    uniqueUsers: { label: "Unique Users", color: "#8B5CF6" }
  }

  return (
    <div className="flex-1 p-4 md:p-8 overflow-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Analytics</h1>
            {!showAllChains && chainConfig && (
              <Badge variant="outline" className="flex items-center gap-1">
                <span>{getChainIcon(chainConfig.chainId)}</span>
                {chainConfig.name}
              </Badge>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => setShowAllChains(!showAllChains)}
              variant={showAllChains ? "default" : "outline"}
              size="sm"
            >
              <Network className="mr-2 h-4 w-4" />
              {showAllChains ? "All Chains" : "Single Chain"}
            </Button>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
                <SelectItem value="year">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchAllAnalytics} disabled={isLoading} variant="outline" size="sm">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
            <Button onClick={handleExportAnalytics} variant="outline" size="sm" disabled={!summary}>
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
          </div>
        </div>
      </div>

      {isLoading && !summary ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          {summary && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(summary.summary.totalOrders)}</div>
                  <p className="text-xs text-muted-foreground">In the last {timeframe}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatVolume(summary.summary.totalVolume)}</div>
                  <p className="text-xs text-muted-foreground">Avg: ${summary.summary.averageAmount.toFixed(2)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(summary.summary.uniqueUsers)}</div>
                  <p className="text-xs text-muted-foreground">Active wallets</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tokens Traded</CardTitle>
                  <Coins className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary.summary.uniqueTokens}</div>
                  <p className="text-xs text-muted-foreground">Across {summary.summary.uniqueChains} chains</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tabs for different analytics views */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="chains">Chains</TabsTrigger>
              <TabsTrigger value="tokens">Tokens</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Timeline Chart */}
                {timeline && timeline.timeline.length > 0 && (
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle>Order Activity Over Time</CardTitle>
                      <CardDescription>Daily order count and volume trends</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfig} className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={timeline.timeline}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="timestamp"
                              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              tick={{ fontSize: 11 }}
                            />
                            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Line
                              yAxisId="left"
                              type="monotone"
                              dataKey="orderCount"
                              stroke="#3B82F6"
                              strokeWidth={2}
                              dot={{ r: 4 }}
                              name="Orders"
                            />
                            <Line
                              yAxisId="right"
                              type="monotone"
                              dataKey="totalVolume"
                              stroke="#10B981"
                              strokeWidth={2}
                              dot={{ r: 4 }}
                              name="Volume (USD)"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Chain Breakdown Chart */}
                {summary && summary.chainBreakdown.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Volume by Chain</CardTitle>
                      <CardDescription>Distribution across blockchains</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfig} className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={summary.chainBreakdown}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="chainName" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                            <ChartTooltip
                              content={<ChartTooltipContent />}
                              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Volume']}
                            />
                            <Bar dataKey="totalVolume" radius={4}>
                              {summary.chainBreakdown.map((entry) => (
                                <Cell key={entry.chainId} fill={CHAIN_COLORS[entry.chainId] || '#6B7280'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Top Tokens List */}
                {summary && summary.topTokens.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Tokens</CardTitle>
                      <CardDescription>By trading volume</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {summary.topTokens.slice(0, 5).map((token, index) => (
                          <div key={token.tokenAddress} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                              <span className="font-mono text-sm truncate max-w-[200px]">
                                {token.tokenAddress.slice(0, 8)}...{token.tokenAddress.slice(-6)}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">{formatVolume(token.totalVolume)}</div>
                              <div className="text-xs text-muted-foreground">{token.percentageOfTotal}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Chains Tab */}
            <TabsContent value="chains" className="space-y-4">
              {chainAnalytics && 'chains' in chainAnalytics && (
                <div className="grid gap-4 md:grid-cols-3">
                  {chainAnalytics.chains.map((chain) => (
                    <Card key={chain.chainId}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <span>{getChainIcon(chain.chainId)}</span>
                          {chain.chainName}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Orders</span>
                            <span className="font-medium">{formatNumber(chain.orderCount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Volume</span>
                            <span className="font-medium">{formatVolume(chain.totalVolume)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Users</span>
                            <span className="font-medium">{formatNumber(chain.uniqueUsers)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tokens</span>
                            <span className="font-medium">{chain.uniqueTokens}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Avg Amount</span>
                            <span className="font-medium">${chain.averageAmount.toFixed(2)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Tokens Tab */}
            <TabsContent value="tokens" className="space-y-4">
              {tokenAnalytics && 'tokens' in tokenAnalytics && (
                <Card>
                  <CardHeader>
                    <CardTitle>Token Analytics</CardTitle>
                    <CardDescription>
                      {tokenAnalytics.totalTokens} tokens traded in the last {timeframe}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Token Address</TableHead>
                          <TableHead>Chain</TableHead>
                          <TableHead className="text-right">Orders</TableHead>
                          <TableHead className="text-right">Volume</TableHead>
                          <TableHead className="text-right">Users</TableHead>
                          <TableHead className="text-right">Avg Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TooltipProvider delayDuration={0}>
                          {tokenAnalytics.tokens.map((token) => (
                            <TableRow key={`${token.chainId}-${token.tokenAddress}`}>
                              <TableCell className="font-mono">
                                <div className="flex items-center gap-2">
                                  {token.tokenAddress.slice(0, 8)}...{token.tokenAddress.slice(-6)}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => handleCopy(token.tokenAddress, "Token Address")}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Copy address</TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                  <span>{getChainIcon(token.chainId)}</span>
                                  {getChainName(token.chainId)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">{formatNumber(token.orderCount)}</TableCell>
                              <TableCell className="text-right">{formatVolume(token.totalVolume)}</TableCell>
                              <TableCell className="text-right">{formatNumber(token.uniqueUsers)}</TableCell>
                              <TableCell className="text-right">${token.averageAmount.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TooltipProvider>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-4">
              {usersSummary && (
                <Card>
                  <CardHeader>
                    <CardTitle>User Analytics</CardTitle>
                    <CardDescription>
                      {usersSummary.totalUsers} unique users with {usersSummary.totalOrders} total orders
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Wallet Address</TableHead>
                          <TableHead className="text-right">Orders</TableHead>
                          <TableHead className="text-right">Total Volume</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TooltipProvider delayDuration={0}>
                          {usersSummary.users.map((user) => (
                            <TableRow key={user.userWallet}>
                              <TableCell className="font-mono">
                                <div className="flex items-center gap-2">
                                  {user.userWallet.slice(0, 8)}...{user.userWallet.slice(-6)}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => handleCopy(user.userWallet, "Wallet Address")}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Copy address</TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">{formatNumber(user.orderCount)}</TableCell>
                              <TableCell className="text-right">{formatVolume(user.totalVolume)}</TableCell>
                              <TableCell>
                                <Button variant="outline" size="sm" asChild>
                                  <a href={`/dashboard/orders?address=${user.userWallet}`}>
                                    View Orders
                                  </a>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TooltipProvider>
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    {usersSummary.totalUsers > usersLimit && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <div className="text-sm text-muted-foreground">
                          Showing {((usersPage - 1) * usersLimit) + 1} to {Math.min(usersPage * usersLimit, usersSummary.totalUsers)} of {usersSummary.totalUsers}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                            disabled={usersPage === 1 || isLoading}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                          </Button>
                          <span className="text-sm px-2">
                            Page {usersPage} of {Math.ceil(usersSummary.totalUsers / usersLimit)}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setUsersPage(p => p + 1)}
                            disabled={usersPage >= Math.ceil(usersSummary.totalUsers / usersLimit) || isLoading}
                          >
                            Next
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Top Users from Summary */}
              {summary && summary.topUsers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Top Users by Volume</CardTitle>
                    <CardDescription>Highest volume traders</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>Wallet Address</TableHead>
                          <TableHead className="text-right">Orders</TableHead>
                          <TableHead className="text-right">Volume</TableHead>
                          <TableHead className="text-right">% of Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TooltipProvider delayDuration={0}>
                          {summary.topUsers.map((user, index) => (
                            <TableRow key={user.userWallet}>
                              <TableCell className="font-medium">#{index + 1}</TableCell>
                              <TableCell className="font-mono">
                                <div className="flex items-center gap-2">
                                  {user.userWallet.slice(0, 8)}...{user.userWallet.slice(-6)}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => handleCopy(user.userWallet, "Wallet Address")}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Copy address</TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">{formatNumber(user.orderCount)}</TableCell>
                              <TableCell className="text-right">{formatVolume(user.totalVolume)}</TableCell>
                              <TableCell className="text-right">{user.percentageOfTotal}%</TableCell>
                            </TableRow>
                          ))}
                        </TooltipProvider>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
