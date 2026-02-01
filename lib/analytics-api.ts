/**
 * Order Analytics API Client
 *
 * Provides typed functions for all order analytics endpoints
 * Base URL: Uses mainPlatformFetch from mainPlatformApi.ts
 */

import { mainPlatformFetch } from './mainPlatformApi'

// ============== Type Definitions ==============

// Order Schema from API
export interface OrderHistoryItem {
  requestId: string // Unique order identifier
  userAddress: string // User's wallet address (lowercase)
  transactionHash: string // Blockchain transaction hash (lowercase)
  serviceType: string // 'airtime' | 'electricity' | 'internet' | 'tv'
  serviceID: string // e.g. 'mtn', 'eko-electric', 'dstv'
  variationCode?: string // Plan type (not required for airtime)
  customerIdentifier: string // Phone number / meter number / smartcard number
  amountNaira: number // Amount in Nigerian Naira
  cryptoUsed: number // Amount of crypto paid by user
  cryptoSymbol: string // 'USDT' | 'USDC' | 'cUSD' | 'CELO' | 'SEND'
  chainId: number // 8453 (Base) | 1135 (Lisk) | 42220 (Celo)
  chainName: string // 'Base' | 'Lisk' | 'Celo'
  onChainStatus: string // 'pending' | 'confirmed' | 'failed'
  vtpassStatus: string // 'pending' | 'successful' | 'failed'
  vtpassResponse?: object // Raw VTpass API response
  createdAt: string // ISO 8601 timestamp
  updatedAt: string // ISO 8601 timestamp
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
    cryptoSymbol: string | 'all'
  }
  dataPoints: number
  timeline: TimelineDataPoint[]
}

// Token Analytics Types
export interface TokenStats {
  cryptoSymbol: string
  chainId: number
  chainName: string
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
  cryptoSymbol: string
  stats: {
    orderCount: number
    totalVolume: number
    uniqueUsers: number
    uniqueChains: number
    averageAmount: number
    minAmount: number
    maxAmount: number
  }
  chainBreakdown: {
    chainId: number
    chainName: string
    orderCount: number
    totalVolume: number
  }[]
  recentOrders: {
    orderId: string
    userAddress: string
    amount: number
    timestamp: string
    transactionHash: string
    chainId: number
    chainName: string
    cryptoSymbol: string
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
    cryptoSymbol: string
    chainId: number
    chainName: string
    orderCount: number
    totalVolume: number
  }[]
  topUsers: {
    userAddress: string
    chainId: number
    chainName: string
    orderCount: number
    totalVolume: number
    tokensUsed: string[]
  }[]
}

// User Analytics Types
export interface UserAnalyticsResponse {
  range: string
  userAddress: string
  filters: {
    chainId: number | 'all'
    cryptoSymbol: string | 'all'
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
    cryptoSymbol: string
    orderCount: number
    totalVolume: number
  }[]
  recentOrders: {
    orderId: string
    chainId: number
    chainName: string
    cryptoSymbol: string
    amount: number
    timestamp: string
    transactionHash: string
    serviceType: string
  }[]
}

// Users Summary Types
export interface UserSummaryItem {
  userAddress: string
  orderCount: number
  totalVolume: number
  chainsUsed: {
    chainId: number
    chainName: string
  }[]
  tokensUsed: string[]
  lastOrderAt: string
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
  cryptoSymbol: string
  orderCount: number
  totalVolume: number
  percentageOfTotal: string
  chainsUsed: {
    chainId: number
    chainName: string
  }[]
}

export interface TopUserItem {
  userAddress: string
  orderCount: number
  totalVolume: number
  percentageOfTotal: string
  chainsUsed: {
    chainId: number
    chainName: string
  }[]
  tokensUsed: string[]
}

export interface ComprehensiveSummaryResponse {
  range: string
  filters: {
    chainId: number | 'all'
    cryptoSymbol: string | 'all'
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
  serviceType?: string
}): Promise<TimelineAnalyticsResponse> {
  const params = new URLSearchParams()
  if (options.range) params.append('range', options.range)
  if (options.interval) params.append('interval', options.interval)
  if (options.chainId) params.append('chainId', options.chainId.toString())
  if (options.serviceType) params.append('serviceType', options.serviceType)

  return mainPlatformFetch<TimelineAnalyticsResponse>(`/api/order-analytics/timeline?${params}`)
}

/**
 * Fetch token-based analytics
 */
export async function fetchTokenAnalytics(options: {
  range?: string
  chainId?: number
  cryptoSymbol?: string
}): Promise<TokenAnalyticsResponse | SingleTokenAnalyticsResponse> {
  const params = new URLSearchParams()
  if (options.range) params.append('range', options.range)
  if (options.chainId) params.append('chainId', options.chainId.toString())
  if (options.cryptoSymbol) params.append('cryptoSymbol', options.cryptoSymbol)

  return mainPlatformFetch<TokenAnalyticsResponse | SingleTokenAnalyticsResponse>(`/api/order-analytics/by-token?${params}`)
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

  return mainPlatformFetch<ChainAnalyticsResponse | SingleChainAnalyticsResponse>(`/api/order-analytics/by-chain?${params}`)
}

/**
 * Fetch comprehensive user analytics
 */
export async function fetchUserAnalytics(
  userAddress: string,
  options: {
    range?: string
    chainId?: number
    cryptoSymbol?: string
  } = {}
): Promise<UserAnalyticsResponse> {
  const params = new URLSearchParams()
  if (options.range) params.append('range', options.range)
  if (options.chainId) params.append('chainId', options.chainId.toString())
  if (options.cryptoSymbol) params.append('cryptoSymbol', options.cryptoSymbol)

  return mainPlatformFetch<UserAnalyticsResponse>(`/api/order-analytics/user/${userAddress}?${params}`)
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

  return mainPlatformFetch<UsersSummaryResponse>(`/api/order-analytics/users-summary?${params}`)
}

/**
 * Fetch comprehensive summary with all breakdowns
 */
export async function fetchComprehensiveSummary(options: {
  range?: string
  chainId?: number
  cryptoSymbol?: string
}): Promise<ComprehensiveSummaryResponse> {
  const params = new URLSearchParams()
  if (options.range) params.append('range', options.range)
  if (options.chainId) params.append('chainId', options.chainId.toString())
  if (options.cryptoSymbol) params.append('cryptoSymbol', options.cryptoSymbol)

  return mainPlatformFetch<ComprehensiveSummaryResponse>(`/api/order-analytics/summary?${params}`)
}

/**
 * Fetch recent orders
 */
export async function fetchRecentOrders(count: number = 10): Promise<{
  orders: OrderHistoryItem[]
  count: number
  requested: number
}> {
  return mainPlatformFetch(`/api/orders/recent?count=${count}`)
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

  return mainPlatformFetch(`/api/orders?${params}`)
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

  return mainPlatformFetch<OrderHistoryItem>(`/api/orders/${orderId}?${params}`)
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

/**
 * Convert Naira amount to USD using live exchange rate
 * @param nairaAmount - Amount in Naira
 * @param ngnRate - NGN rate from API (1 USDT = X NGN)
 */
export function convertNairaToUSD(nairaAmount: number, ngnRate: number): number {
  if (!ngnRate || ngnRate <= 0) {
    console.warn('Invalid NGN rate, using fallback rate of 1600')
    return nairaAmount / 1500
  }
  return nairaAmount / ngnRate
}

/**
 * Convert and format Naira amount to USD display
 * @param nairaAmount - Amount in Naira
 * @param ngnRate - NGN rate from API (1 USDT = X NGN)
 */
export function formatNairaAsUSD(nairaAmount: number, ngnRate: number): string {
  const usdAmount = convertNairaToUSD(nairaAmount, ngnRate)
  return formatVolume(usdAmount)
}
