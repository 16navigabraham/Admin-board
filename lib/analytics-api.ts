/**
 * Order Analytics API Client
 *
 * Provides typed functions for all order analytics endpoints
 * Base URL: process.env.NEXT_PUBLIC_BACKEND_API_URL
 */

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL

// ============== Type Definitions ==============

export interface OrderHistoryItem {
  orderId: string
  requestId: string
  userWallet: string
  tokenAddress: string
  amount: string // Amount in wei (BigInt string)
  txnHash: string
  blockNumber: number
  timestamp: string // ISO 8601 timestamp
  chainId: number // Chain ID (8453=Base, 1135=Lisk, 42220=Celo)
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  pages: number
}

// Timeline Analytics Types
export interface TimelineDataPoint {
  timestamp: string
  orderCount: number
  totalVolume: number
  uniqueUsers: number
  uniqueTokens: number
  averageAmount: number
}

export interface TimelineAnalyticsResponse {
  range: string
  interval: string
  filters: {
    chainId: number | 'all'
    tokenAddress: string | 'all'
  }
  dataPoints: number
  timeline: TimelineDataPoint[]
}

// Token Analytics Types
export interface TokenStats {
  tokenAddress: string
  chainId: number
  orderCount: number
  totalVolume: number
  uniqueUsers: number
  averageAmount: number
}

export interface TokenAnalyticsResponse {
  range: string
  chainId?: number
  totalTokens: number
  tokens: TokenStats[]
}

export interface SingleTokenAnalyticsResponse {
  range: string
  tokenAddress: string
  chainId: number
  stats: {
    orderCount: number
    totalVolume: number
    uniqueUsers: number
    averageAmount: number
    minAmount: number
    maxAmount: number
  }
  recentOrders: {
    orderId: string
    userWallet: string
    amount: number
    timestamp: string
    transactionHash: string
  }[]
}

// Chain Analytics Types
export interface ChainStats {
  chainId: number
  chainName: string
  orderCount: number
  totalVolume: number
  uniqueUsers: number
  uniqueTokens: number
  averageAmount: number
}

export interface ChainAnalyticsResponse {
  range: string
  totalChains: number
  chains: ChainStats[]
}

export interface SingleChainAnalyticsResponse {
  range: string
  chainId: number
  chainName: string
  stats: {
    orderCount: number
    totalVolume: number
    uniqueUsers: number
    uniqueTokens: number
    averageAmount: number
  }
  topTokens: {
    tokenAddress: string
    orderCount: number
    totalVolume: number
  }[]
  topUsers: {
    userWallet: string
    orderCount: number
    totalVolume: number
  }[]
}

// User Analytics Types
export interface UserAnalyticsResponse {
  range: string
  userWallet: string
  filters: {
    chainId: number | 'all'
    tokenAddress: string | 'all'
  }
  stats: {
    orderCount: number
    totalVolume: number
    uniqueChains: number
    uniqueTokens: number
    averageAmount: number
    firstOrder: string
    lastOrder: string
  }
  chainBreakdown: {
    chainId: number
    chainName: string
    orderCount: number
    totalVolume: number
  }[]
  tokenBreakdown: {
    tokenAddress: string
    orderCount: number
    totalVolume: number
  }[]
  recentOrders: {
    orderId: string
    chainId: number
    tokenAddress: string
    amount: number
    timestamp: string
    transactionHash: string
  }[]
}

// Users Summary Types
export interface UserSummaryItem {
  userWallet: string
  orderCount: number
  totalVolume: number
}

export interface UsersSummaryResponse {
  range: string
  chainId?: number
  totalUsers: number
  totalOrders: number
  page: number
  limit: number
  users: UserSummaryItem[]
}

// Comprehensive Summary Types
export interface ChainBreakdownItem {
  chainId: number
  chainName: string
  orderCount: number
  totalVolume: number
  percentageOfTotal: string
}

export interface TopTokenItem {
  tokenAddress: string
  orderCount: number
  totalVolume: number
  percentageOfTotal: string
}

export interface TopUserItem {
  userWallet: string
  orderCount: number
  totalVolume: number
  percentageOfTotal: string
}

export interface ComprehensiveSummaryResponse {
  range: string
  filters: {
    chainId: number | 'all'
    tokenAddress: string | 'all'
  }
  summary: {
    totalOrders: number
    totalVolume: number
    uniqueUsers: number
    uniqueTokens: number
    uniqueChains: number
    averageAmount: number
  }
  chainBreakdown: ChainBreakdownItem[]
  topTokens: TopTokenItem[]
  topUsers: TopUserItem[]
}

// ============== API Functions ==============

/**
 * Fetch timeline analytics with customizable intervals
 */
export async function fetchTimelineAnalytics(options: {
  range?: string
  interval?: 'hour' | 'day' | 'month'
  chainId?: number
  tokenAddress?: string
}): Promise<TimelineAnalyticsResponse> {
  const params = new URLSearchParams()
  if (options.range) params.append('range', options.range)
  if (options.interval) params.append('interval', options.interval)
  if (options.chainId) params.append('chainId', options.chainId.toString())
  if (options.tokenAddress) params.append('tokenAddress', options.tokenAddress)

  const response = await fetch(`${BASE_URL}/api/order-analytics/timeline?${params}`)
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Failed to fetch timeline analytics: HTTP ${response.status}`)
  }
  return response.json()
}

/**
 * Fetch token-based analytics
 */
export async function fetchTokenAnalytics(options: {
  range?: string
  chainId?: number
  tokenAddress?: string
}): Promise<TokenAnalyticsResponse | SingleTokenAnalyticsResponse> {
  const params = new URLSearchParams()
  if (options.range) params.append('range', options.range)
  if (options.chainId) params.append('chainId', options.chainId.toString())
  if (options.tokenAddress) params.append('tokenAddress', options.tokenAddress)

  const response = await fetch(`${BASE_URL}/api/order-analytics/by-token?${params}`)
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Failed to fetch token analytics: HTTP ${response.status}`)
  }
  return response.json()
}

/**
 * Fetch chain-based analytics
 */
export async function fetchChainAnalytics(options: {
  range?: string
  chainId?: number
}): Promise<ChainAnalyticsResponse | SingleChainAnalyticsResponse> {
  const params = new URLSearchParams()
  if (options.range) params.append('range', options.range)
  if (options.chainId) params.append('chainId', options.chainId.toString())

  const response = await fetch(`${BASE_URL}/api/order-analytics/by-chain?${params}`)
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Failed to fetch chain analytics: HTTP ${response.status}`)
  }
  return response.json()
}

/**
 * Fetch comprehensive user analytics
 */
export async function fetchUserAnalytics(
  userWallet: string,
  options: {
    range?: string
    chainId?: number
    tokenAddress?: string
  } = {}
): Promise<UserAnalyticsResponse> {
  const params = new URLSearchParams()
  if (options.range) params.append('range', options.range)
  if (options.chainId) params.append('chainId', options.chainId.toString())
  if (options.tokenAddress) params.append('tokenAddress', options.tokenAddress)

  const response = await fetch(`${BASE_URL}/api/order-analytics/user/${userWallet}?${params}`)
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Failed to fetch user analytics: HTTP ${response.status}`)
  }
  return response.json()
}

/**
 * Fetch users summary (unique users with order counts)
 */
export async function fetchUsersSummary(options: {
  range?: string
  chainId?: number
  page?: number
  limit?: number
}): Promise<UsersSummaryResponse> {
  const params = new URLSearchParams()
  if (options.range) params.append('range', options.range)
  if (options.chainId) params.append('chainId', options.chainId.toString())
  if (options.page) params.append('page', options.page.toString())
  if (options.limit) params.append('limit', options.limit.toString())

  const response = await fetch(`${BASE_URL}/api/order-analytics/users-summary?${params}`)
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Failed to fetch users summary: HTTP ${response.status}`)
  }
  return response.json()
}

/**
 * Fetch comprehensive summary with all breakdowns
 */
export async function fetchComprehensiveSummary(options: {
  range?: string
  chainId?: number
  tokenAddress?: string
}): Promise<ComprehensiveSummaryResponse> {
  const params = new URLSearchParams()
  if (options.range) params.append('range', options.range)
  if (options.chainId) params.append('chainId', options.chainId.toString())
  if (options.tokenAddress) params.append('tokenAddress', options.tokenAddress)

  const response = await fetch(`${BASE_URL}/api/order-analytics/summary?${params}`)
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Failed to fetch comprehensive summary: HTTP ${response.status}`)
  }
  return response.json()
}

/**
 * Fetch recent orders
 */
export async function fetchRecentOrders(count: number = 10): Promise<{
  orders: OrderHistoryItem[]
  count: number
  requested: number
}> {
  const response = await fetch(`${BASE_URL}/api/orders/recent/${count}`)
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Failed to fetch recent orders: HTTP ${response.status}`)
  }
  return response.json()
}

/**
 * Fetch orders with filtering and pagination
 */
export async function fetchOrders(options: {
  page?: number
  limit?: number
  range?: string
  user?: string
  token?: string
  chainId?: number
  sort?: string
  order?: 'asc' | 'desc'
}): Promise<{
  orders: OrderHistoryItem[]
  pagination: PaginationInfo
  filters: Record<string, string | number>
}> {
  const params = new URLSearchParams()
  if (options.page) params.append('page', options.page.toString())
  if (options.limit) params.append('limit', options.limit.toString())
  if (options.range) params.append('range', options.range)
  if (options.user) params.append('user', options.user)
  if (options.token) params.append('token', options.token)
  if (options.chainId) params.append('chainId', options.chainId.toString())
  if (options.sort) params.append('sort', options.sort)
  if (options.order) params.append('order', options.order)

  const response = await fetch(`${BASE_URL}/api/orders?${params}`)
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Failed to fetch orders: HTTP ${response.status}`)
  }
  return response.json()
}

/**
 * Fetch single order by ID
 */
export async function fetchOrderById(
  orderId: string,
  chainId?: number
): Promise<OrderHistoryItem> {
  const params = new URLSearchParams()
  if (chainId) params.append('chainId', chainId.toString())

  const response = await fetch(`${BASE_URL}/api/orders/${orderId}?${params}`)
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Failed to fetch order: HTTP ${response.status}`)
  }
  return response.json()
}

/**
 * Fetch orders by token address
 */
export async function fetchOrdersByToken(
  tokenAddress: string,
  options: {
    page?: number
    limit?: number
  } = {}
): Promise<{
  orders: OrderHistoryItem[]
  pagination: PaginationInfo
}> {
  const params = new URLSearchParams()
  if (options.page) params.append('page', options.page.toString())
  if (options.limit) params.append('limit', options.limit.toString())

  const response = await fetch(`${BASE_URL}/api/orders/token/${tokenAddress}?${params}`)
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Failed to fetch orders by token: HTTP ${response.status}`)
  }
  return response.json()
}

// ============== Helper Functions ==============

/**
 * Get chain name from chain ID
 */
export function getChainName(chainId: number): string {
  switch (chainId) {
    case 8453: return 'Base'
    case 1135: return 'Lisk'
    case 42220: return 'Celo'
    default: return `Chain ${chainId}`
  }
}

/**
 * Get chain icon/emoji from chain ID
 */
export function getChainIcon(chainId: number): string {
  switch (chainId) {
    case 8453: return '🔵' // Base
    case 1135: return '🟣' // Lisk
    case 42220: return '🟡' // Celo
    default: return '⚪'
  }
}

/**
 * Format amount from wei string to readable number
 */
export function formatAmountFromWei(amountWei: string, decimals: number = 18): string {
  const amount = parseFloat(amountWei) / Math.pow(10, decimals)
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  })
}

/**
 * Format volume for display
 */
export function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return `$${(volume / 1000000).toFixed(2)}M`
  } else if (volume >= 1000) {
    return `$${(volume / 1000).toFixed(2)}K`
  }
  return `$${volume.toFixed(2)}`
}

/**
 * Format large numbers with abbreviations
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toLocaleString()
}
