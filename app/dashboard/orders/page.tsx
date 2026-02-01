"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { CONTRACT_ABI, getContractAddressByKey, getExplorerUrl, getChainConfig } from "@/config/contract"
import { createPublicClient, http, decodeFunctionData, type Hex, decodeEventLog, stringToBytes, pad, toHex, formatUnits } from "viem"
import { base, celo } from "viem/chains"
import { useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from "wagmi"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Copy, Search, Network, Download } from 'lucide-react'
import { getUserHistory } from "@/lib/api"
import { mainPlatformFetch } from "@/lib/mainPlatformApi"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useChain } from "@/contexts/chain-context"
import { Badge } from "@/components/ui/badge"
import { exportOrdersToExcel, exportMainPlatformOrdersToExcel } from "@/lib/export-utils"
import { fetchUserAnalytics, type UserAnalyticsResponse, getChainName as getAnalyticsChainName, getChainIcon, formatVolume, convertNairaToUSD } from "@/lib/analytics-api"

// Define Lisk chain config (not in viem by default)
const liskChain = {
  id: 1135,
  name: 'Lisk',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.api.lisk.com'] },
    public: { http: ['https://rpc.api.lisk.com'] },
  },
  blockExplorers: {
    default: { name: 'Lisk Explorer', url: 'https://blockscout.lisk.com' },
  },
} as const

interface DecodedTxnData {
  functionName: string
  args: any[]
}

// Updated interface to match the blockchain indexer API response from /api/orders/user/:userWallet
interface OrderHistoryItem {
  _id: string // MongoDB document ID
  orderId: string // Unique order identifier
  chainId: number // Chain ID (8453=Base, 1135=Lisk, 42220=Celo)
  requestId: string // Request identifier
  userWallet: string // User's wallet address (lowercase)
  tokenAddress: string // Token contract address (lowercase)
  amount: string // Order amount in wei (raw token units)
  txnHash: string // Transaction hash (lowercase)
  blockNumber: number // Block number where transaction was included
  timestamp: string // ISO 8601 timestamp of the order
  createdAt: string // ISO 8601 timestamp when record was created
  updatedAt: string // ISO 8601 timestamp when record was last updated
  formattedAmount?: number // Human-readable amount (divided by 10^18)
  chainName?: string // Human-readable chain name (Base, Lisk, Celo) - added for display
}

interface BlockchainHistoryResponse {
  userWallet: string
  orders: OrderHistoryItem[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

// Interface for main platform database orders - matching API documentation
interface MainPlatformOrder {
  _id?: string // MongoDB document ID
  requestId: string
  userAddress: string
  transactionHash: string
  serviceType: string // 'airtime' | 'electricity' | 'internet' | 'tv'
  serviceID: string
  variationCode?: string
  customerIdentifier: string
  amountNaira: number
  cryptoUsed: number
  cryptoSymbol: string // 'USDT' | 'USDC' | 'cUSD' | 'CELO' | 'SEND'
  chainId: number
  chainName: string
  onChainStatus: string
  vtpassStatus: string
  vtpassResponse?: object
  createdAt: string
  updatedAt: string
}

export default function ManageOrdersPage() {
  const { selectedChain, chainConfig } = useChain()
  const [txnHash, setTxnHash] = useState<string>("")
  const [decodedData, setDecodedData] = useState<DecodedTxnData | null>(null)
  const [orderIdToProcess, setOrderIdToProcess] = useState<string>("")
  const [transactionHistory, setTransactionHistory] = useState<OrderHistoryItem[]>([]) // Changed type
  const [transactionPagination, setTransactionPagination] = useState<{ page: number; limit: number; total: number; pages: number } | null>(null)
  const [isDecoding, setIsDecoding] = useState(false)
  const [isFetchingHistory, setIsFetchingHistory] = useState(false)
  const [historyAddress, setHistoryAddress] = useState<string>("")
  const [historyPage, setHistoryPage] = useState<number>(1)
  const [historyLimit, setHistoryLimit] = useState<number>(50)

  // New state for main platform history
  const [mainPlatformHistory, setMainPlatformHistory] = useState<MainPlatformOrder[]>([])
  const [isFetchingMainPlatformHistory, setIsFetchingMainPlatformHistory] = useState(false)
  const [mainPlatformHistoryAddress, setMainPlatformHistoryAddress] = useState<string>("")

  const [requestIdToDecode, setRequestIdToDecode] = useState<string>("")
  const [decodedRequestIdBytes32, setDecodedRequestIdBytes32] = useState<Hex | null>(null)
  const [foundTxnByRequestId, setFoundTxnByRequestId] = useState<any | null>(null)
  const [isSearchingRequestId, setIsSearchingRequestId] = useState(false)

  // User analytics state
  const [userAnalytics, setUserAnalytics] = useState<UserAnalyticsResponse | null>(null)
  const [isFetchingUserAnalytics, setIsFetchingUserAnalytics] = useState(false)
  const [userAnalyticsAddress, setUserAnalyticsAddress] = useState<string>("")
  const [userAnalyticsTimeframe, setUserAnalyticsTimeframe] = useState<string>("30d")
  const [ngnExchangeRate, setNgnExchangeRate] = useState<number>(1600) // Default fallback rate

  const { data: hash, writeContract, isPending: isWriting, error: writeError } = useWriteContract()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const { switchChain } = useSwitchChain()

  // Create dynamic public client based on selected chain
  const publicClient = useMemo(() => {
    const viemChain = selectedChain === 'base' ? base : 
                      selectedChain === 'lisk' ? liskChain : 
                      celo
    
    return createPublicClient({
      chain: viemChain,
      transport: http(chainConfig?.rpcUrl),
    })
  }, [selectedChain, chainConfig])

  // Get current chain's contract address
  const contractAddress = useMemo(() => 
    getContractAddressByKey(selectedChain),
    [selectedChain]
  )

  // Get current chain's explorer URL
  const explorerUrl = useMemo(() => 
    chainConfig?.explorer || 'https://basescan.org',
    [chainConfig]
  )

  const handleDecodeTxn = async () => {
    if (!txnHash) {
      toast.error("Please enter a transaction hash.")
      return
    }
    setIsDecoding(true)
    setDecodedData(null)
    setOrderIdToProcess("") // Clear previous order ID

    try {
      const transaction = await publicClient.getTransaction({
        hash: txnHash as Hex,
      })

      if (!transaction) {
        toast.error("Transaction not found.")
        return
      }

      // Decode function input data
      let decodedInput: DecodedTxnData | null = null
      try {
        const { functionName, args } = decodeFunctionData({
          abi: CONTRACT_ABI,
          data: transaction.input,
        })
        decodedInput = { functionName, args: [...args] as any[] }
        setDecodedData(decodedInput)
      } catch (e) {
        console.warn("Could not decode transaction input data:", e)
        setDecodedData({ functionName: "Unknown", args: [] })
      }

      // Fetch and decode transaction receipt for events to get actual orderId
      const receipt = await publicClient.getTransactionReceipt({
        hash: txnHash as Hex,
      })

      let foundActualOrderId: string | undefined
      if (receipt && receipt.logs) {
        for (const log of receipt.logs) {
          try {
            const decodedEvent = decodeEventLog({
              abi: CONTRACT_ABI,
              data: log.data,
              topics: log.topics,
            })

            if (decodedEvent.eventName === "OrderCreated") {
              foundActualOrderId = (decodedEvent.args as any).orderId.toString()
              if (foundActualOrderId) {
                setOrderIdToProcess(foundActualOrderId)
                toast.success(`Transaction decoded and actual Order ID ${foundActualOrderId} found from event!`)
                return // Found the actual order ID, no need to check other logs
              }
            }
          } catch (e) {
            // Ignore logs that don't match our ABI or are not OrderCreated
          }
        }
      }

      if (!foundActualOrderId) {
        toast.info("No 'OrderCreated' event found in this transaction's logs.")
        // If it's a createOrder call and no actual orderId found, suggest using Request ID
        if (decodedInput?.functionName === "createOrder" && decodedInput.args && decodedInput.args.length > 0) {
          // Assuming requestId is the first arg and is bytes32
          const requestIdArg = decodedInput.args[0]
          if (typeof requestIdArg === "string" && requestIdArg.startsWith("0x") && requestIdArg.length === 66) {
            // If it's already a bytes32 hex, use it directly
            setOrderIdToProcess(requestIdArg)
            toast.info("Using Request ID (bytes32) from input as a fallback for Order ID.")
          } else {
            // Fallback for other types or if not bytes32
            setOrderIdToProcess(requestIdArg.toString())
            toast.info("Using Request ID from input as a fallback for Order ID.")
          }
        }
      }
    } catch (error: any) {
      console.error("Error decoding transaction:", error)
      toast.error(`Failed to decode transaction: ${error.message || error}`)
    } finally {
      setIsDecoding(false)
    }
  }

  const handleMarkOrderSuccessful = async () => {
    if (!orderIdToProcess) {
      toast.error("Please enter an Order ID.")
      return
    }
    try {
      // Switch to the correct chain first
      if (chainConfig?.chainId && switchChain) {
        await switchChain({ chainId: chainConfig.chainId })
        toast.info(`Switched to ${chainConfig.name} network`)
      }
      
      writeContract({
        address: contractAddress,
        abi: CONTRACT_ABI,
        functionName: "markOrderSuccessful",
        args: [BigInt(orderIdToProcess)],
        chainId: chainConfig?.chainId,
      })
      toast.info(`Marking order successful on ${chainConfig?.name}...`)
    } catch (error: any) {
      console.error("Error marking order successful:", error)
      toast.error(`Failed to mark order successful: ${error.message || error}`)
    }
  }

  const handleMarkOrderFailed = async () => {
    if (!orderIdToProcess) {
      toast.error("Please enter an Order ID.")
      return
    }
    try {
      // Switch to the correct chain first
      if (chainConfig?.chainId && switchChain) {
        await switchChain({ chainId: chainConfig.chainId })
        toast.info(`Switched to ${chainConfig.name} network`)
      }
      
      writeContract({
        address: contractAddress,
        abi: CONTRACT_ABI,
        functionName: "markOrderFailed",
        args: [BigInt(orderIdToProcess)],
        chainId: chainConfig?.chainId,
      })
      toast.info(`Marking order failed on ${chainConfig?.name}...`)
    } catch (error: any) {
      console.error("Error marking order failed:", error)
      toast.error(`Failed to mark order failed: ${error.message || error}`)
    }
  }

  const handleFetchTransactionHistory = async () => {
    if (!historyAddress) {
      toast.error("Please enter an address to fetch history.")
      return
    }
    setIsFetchingHistory(true)
    try {
      const response: BlockchainHistoryResponse = await getUserHistory(historyAddress, historyPage, historyLimit)
      
      const processedHistory = response.orders.map((tx) => ({
        ...tx,
        // formattedAmount is already provided by the API, but we can recalculate if needed
        formattedAmount: tx.formattedAmount || parseFloat(formatUnits(BigInt(tx.amount), 18)),
        // Format timestamp from ISO string to local date/time string for display
        timestamp: new Date(tx.timestamp).toLocaleString(),
        // Add human-readable chain name
        chainName: tx.chainId === 8453 ? 'Base' : tx.chainId === 1135 ? 'Lisk' : tx.chainId === 42220 ? 'Celo' : 'Unknown'
      }))

      setTransactionHistory(processedHistory)
      setTransactionPagination(response.pagination)
      toast.success(`Fetched ${response.orders.length} orders (Page ${response.pagination.page} of ${response.pagination.pages})`)
    } catch (error: any) {
      console.error("Error fetching transaction history:", error)
      toast.error(`Failed to fetch transaction history: ${error.message || error}`)
    } finally {
      setIsFetchingHistory(false)
    }
  }

  // New function to fetch main platform history
  const handleFetchMainPlatformHistory = async () => {
    if (!mainPlatformHistoryAddress) {
      toast.error("Please enter an address to fetch main platform history.")
      return
    }
    setIsFetchingMainPlatformHistory(true)
    setMainPlatformHistory([])
    try {
      const data = await mainPlatformFetch<{ success: boolean; orders: MainPlatformOrder[] }>(
        `/api/history?userAddress=${encodeURIComponent(mainPlatformHistoryAddress)}`
      )
      
      if (data.success && data.orders) {
        setMainPlatformHistory(data.orders)
        toast.success("Main platform history fetched successfully!")
      } else {
        toast.error("Failed to fetch main platform history: Invalid response format")
      }
    } catch (error: any) {
      console.error("Error fetching main platform history:", error)
      toast.error(`Failed to fetch main platform history: ${error.message || error}`)
    } finally {
      setIsFetchingMainPlatformHistory(false)
    }
  }

  const handleDecodeRequestId = async () => {
    if (!requestIdToDecode) {
      toast.error("Please enter a Request ID.")
      return
    }
    setIsSearchingRequestId(true)
    setDecodedRequestIdBytes32(null)
    setFoundTxnByRequestId(null)

    try {
      // Convert the string requestId to bytes32 (padded with null bytes)
      const bytes = stringToBytes(requestIdToDecode)
      const paddedBytes32 = pad(bytes, { size: 32 })
      const hexPaddedBytes32 = toHex(paddedBytes32)
      setDecodedRequestIdBytes32(hexPaddedBytes32)
      toast.info(`Request ID converted to bytes32: ${hexPaddedBytes32}`)

      // Fetch all orders from the backend to search for the requestId
      const allOrdersResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/orders`)
      if (!allOrdersResponse.ok) {
        const errorData = await allOrdersResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch all orders for search: HTTP ${allOrdersResponse.status}`);
      }
      const allOrdersData: { orders: OrderHistoryItem[] } = await allOrdersResponse.json()

      const foundTx = allOrdersData.orders.find(
        (order) => order.requestId === requestIdToDecode // Compare directly with the string requestId
      )

      if (foundTx) {
        setFoundTxnByRequestId(foundTx)
        toast.success("Matching transaction found!")
      } else {
        toast.info("No matching 'createOrder' transaction found in history for this Request ID.")
      }
    } catch (error: any) {
      console.error("Error decoding/searching Request ID:", error)
      toast.error(`Failed to decode or search Request ID: ${error.message || error}`)
    } finally {
      setIsSearchingRequestId(false)
    }
  }

  const handleUseOrderId = (orderId: string) => {
    setOrderIdToProcess(orderId)
    toast.info(`Order ID ${orderId} copied to input.`)
  }

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.info(`${label} copied to clipboard.`)
  }

  const getStatusBadge = (status: string) => {
    const statusClass = status === "successful"
      ? "bg-green-100 text-green-800"
      : status === "failed"
      ? "bg-red-100 text-red-800"
      : "bg-yellow-100 text-yellow-800"

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClass}`}>
        {status}
      </span>
    )
  }

  const handleExportTransactionHistory = async () => {
    if (transactionHistory.length === 0) {
      toast.error("No transaction history to export.")
      return
    }

    try {
      const getChainNameLocal = (chainId: number) =>
        chainId === 8453 ? 'Base' : chainId === 1135 ? 'Lisk' : chainId === 42220 ? 'Celo' : 'Unknown'

      const exportData = transactionHistory.map(tx => ({
        orderId: tx.orderId,
        requestId: tx.requestId,
        userWallet: tx.userWallet,
        tokenAddress: tx.tokenAddress,
        amount: tx.amount,
        txnHash: tx.txnHash,
        timestamp: tx.timestamp,
        chainId: tx.chainId,
        chainName: getChainNameLocal(tx.chainId)
      }))

      const filename = `user_orders_${historyAddress.slice(0, 8)}_${new Date().toISOString().split('T')[0]}.xlsx`
      await exportOrdersToExcel(exportData, filename, 'User Orders')
      toast.success(`Exported ${exportData.length} orders to Excel!`)
    } catch (error: any) {
      console.error('Export error:', error)
      toast.error(`Failed to export: ${error.message}`)
    }
  }

  const handleExportMainPlatformHistory = async () => {
    if (mainPlatformHistory.length === 0) {
      toast.error("No main platform history to export.")
      return
    }

    try {
      const exportData = mainPlatformHistory.map(order => ({
        requestId: order.requestId,
        chainName: order.chainName || 'Unknown',
        transactionHash: order.transactionHash,
        serviceType: order.serviceType,
        serviceID: order.serviceID,
        customerIdentifier: order.customerIdentifier,
        amountNaira: order.amountNaira,
        cryptoUsed: order.cryptoUsed,
        cryptoSymbol: order.cryptoSymbol,
        onChainStatus: order.onChainStatus,
        vtpassStatus: order.vtpassStatus,
        createdAt: new Date(order.createdAt).toLocaleString()
      }))

      const filename = `main_platform_orders_${mainPlatformHistoryAddress.slice(0, 8)}_${new Date().toISOString().split('T')[0]}.xlsx`
      await exportMainPlatformOrdersToExcel(exportData, filename)
      toast.success(`Exported ${exportData.length} main platform orders to Excel!`)
    } catch (error: any) {
      console.error('Export error:', error)
      toast.error(`Failed to export: ${error.message}`)
    }
  }

  const handleFetchUserAnalytics = async () => {
    if (!userAnalyticsAddress) {
      toast.error("Please enter a wallet address to fetch user analytics.")
      return
    }
    setIsFetchingUserAnalytics(true)
    setUserAnalytics(null)
    try {
      // Fetch exchange rate first
      try {
        const rateResponse = await fetch('https://paycrypt-margin-price.onrender.com/api/v3/simple/price?ids=tether&vs_currencies=ngn,usd')
        if (rateResponse.ok) {
          const rateData = await rateResponse.json()
          if (rateData.tether && rateData.tether.ngn) {
            setNgnExchangeRate(rateData.tether.ngn)
          }
        }
      } catch (error) {
        console.warn('Failed to fetch exchange rate, using fallback:', error)
      }

      const data = await fetchUserAnalytics(userAnalyticsAddress, {
        range: userAnalyticsTimeframe
      })
      
      // Convert all Naira amounts to USD
      const convertedData: UserAnalyticsResponse = {
        ...data,
        stats: {
          ...data.stats,
          totalVolume: convertNairaToUSD(data.stats.totalVolume, ngnExchangeRate),
          averageAmount: convertNairaToUSD(data.stats.averageAmount, ngnExchangeRate)
        },
        chainBreakdown: data.chainBreakdown.map(chain => ({
          ...chain,
          totalVolume: convertNairaToUSD(chain.totalVolume, ngnExchangeRate)
        })),
        tokenBreakdown: data.tokenBreakdown.map(token => ({
          ...token,
          totalVolume: convertNairaToUSD(token.totalVolume, ngnExchangeRate)
        })),
        recentOrders: data.recentOrders.map(order => ({
          ...order,
          amount: convertNairaToUSD(order.amount, ngnExchangeRate)
        }))
      }
      
      setUserAnalytics(convertedData)
      toast.success("User analytics fetched successfully!")
    } catch (error: any) {
      console.error("Error fetching user analytics:", error)
      toast.error(`Failed to fetch user analytics: ${error.message || error}`)
    } finally {
      setIsFetchingUserAnalytics(false)
    }
  }

  return (
    <div className="flex-1 p-4 md:p-8 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Order Tools</h1>
        <Badge variant="outline" className="flex items-center gap-2">
          <Network className="h-3 w-3" />
          {chainConfig?.name} Chain
        </Badge>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Decode Transaction Input & Find Actual Order ID (On-chain)</CardTitle>
          <CardDescription>
            Fetches transaction details and attempts to extract the on-chain Order ID from `OrderCreated` events or `createOrder` function arguments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="txn-hash">Transaction Hash</Label>
              <Input
                id="txn-hash"
                placeholder="0x..."
                value={txnHash}
                onChange={(e) => setTxnHash(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button onClick={handleDecodeTxn} disabled={isDecoding}>
              {isDecoding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Decoding...
                </>
              ) : (
                "Decode Transaction"
              )}
            </Button>
            {decodedData && (
              <div className="mt-4 p-4 border rounded-md bg-muted">
                <h3 className="font-semibold">Decoded Input Data:</h3>
                <p>
                  <strong>Function:</strong> {decodedData.functionName}
                </p>
                <p>
                  <strong>Arguments:</strong>{" "}
                  {JSON.stringify(
                    decodedData.args.map((arg) => (typeof arg === "bigint" ? arg.toString() : arg)),
                    null,
                    2,
                  )}
                </p>
                {orderIdToProcess && (
                  <div className="mt-2">
                    <p>
                      <strong>Extracted Order ID:</strong> {orderIdToProcess}
                      <span className="text-sm text-muted-foreground ml-2">
                        (This is the actual on-chain ID from the `OrderCreated` event, or Request ID if event not found)
                      </span>
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 bg-transparent"
                      onClick={() => handleUseOrderId(orderIdToProcess)}
                    >
                      <Copy className="mr-2 h-4 w-4" /> Use this Order ID
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Decode Request ID & Find Transaction (Database Search)</CardTitle>
          <CardDescription>
            Convert a human-readable Request ID to its `bytes32` representation and find matching transactions from the backend database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="request-id-to-decode">Request ID String</Label>
              <Input
                id="request-id-to-decode"
                placeholder="e.g., 1754295986817-AGQUEO"
                value={requestIdToDecode}
                onChange={(e) => setRequestIdToDecode(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button onClick={handleDecodeRequestId} disabled={isSearchingRequestId}>
              {isSearchingRequestId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" /> Convert & Find Transaction
                </>
              )}
            </Button>
            {decodedRequestIdBytes32 && (
              <div className="mt-4 p-4 border rounded-md bg-muted">
                <h3 className="font-semibold">Converted Request ID (bytes32):</h3>
                <p className="break-all font-mono text-sm">{decodedRequestIdBytes32}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Note: This search is performed against the backend's indexed orders.
                </p>
                {foundTxnByRequestId && (
                  <div className="mt-4">
                    <h3 className="font-semibold">Matching Transaction Found:</h3>
                    <p>
                      <strong>Order ID:</strong> {foundTxnByRequestId.orderId}
                    </p>
                    <p>
                      <strong>Hash:</strong>{" "}
                      <a
                        href={`${explorerUrl}/tx/${foundTxnByRequestId.txnHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        {foundTxnByRequestId.txnHash ? `${foundTxnByRequestId.txnHash.slice(0, 10)}...${foundTxnByRequestId.txnHash.slice(-8)}` : 'N/A'}
                      </a>
                    </p>
                    <p>
                      <strong>User Wallet:</strong>{" "}
                      <a
                        href={`${explorerUrl}/address/${foundTxnByRequestId.userWallet}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        {foundTxnByRequestId.userWallet ? `${foundTxnByRequestId.userWallet.slice(0, 10)}...${foundTxnByRequestId.userWallet.slice(-8)}` : 'N/A'}
                      </a>
                    </p>
                    <p>
                      <strong>Amount:</strong> {foundTxnByRequestId.amount}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 bg-transparent"
                      onClick={() => handleUseOrderId(foundTxnByRequestId.orderId!)}
                    >
                      <Copy className="mr-2 h-4 w-4" /> Use this Order ID
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Manage Order Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="order-id">Order ID</Label>
              <Input
                id="order-id"
                placeholder="Enter Order ID"
                value={orderIdToProcess}
                onChange={(e) => setOrderIdToProcess(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleMarkOrderSuccessful} disabled={isWriting || isConfirming}>
                {isWriting && hash === undefined ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirming...
                  </>
                ) : isConfirming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                  </>
                ) : (
                  "Mark Order Successful"
                )}
              </Button>
              <Button onClick={handleMarkOrderFailed} variant="destructive" disabled={isWriting || isConfirming}>
                {isWriting && hash === undefined ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirming...
                  </>
                ) : isConfirming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                  </>
                ) : (
                  "Mark Order Failed"
                )}
              </Button>
            </div>
            {hash && (
              <div className="mt-2 text-sm text-muted-foreground">
                Transaction Hash:{" "}
                <a
                  href={`${explorerUrl}/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {hash}
                </a>
              </div>
            )}
            {isConfirmed && <div className="mt-2 text-sm text-green-500">Transaction confirmed!</div>}
            {writeError && <div className="mt-2 text-sm text-red-500">Error: {writeError.message}</div>}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Transaction History (User Specific txn Onchain)</CardTitle>
          <CardDescription>
            Displays application-level orders for a specific user, fetched from the onchain database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="history-address">User Address</Label>
              <Input
                id="history-address"
                placeholder="0x..."
                value={historyAddress}
                onChange={(e) => setHistoryAddress(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleFetchTransactionHistory} disabled={isFetchingHistory}>
                {isFetchingHistory ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fetching...
                  </>
                ) : (
                  "Fetch Transaction History"
                )}
              </Button>
              {transactionHistory.length > 0 && (
                <Button
                  onClick={handleExportTransactionHistory}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export to Excel
                </Button>
              )}
            </div>
            
            {/* Pagination Controls */}
            {transactionPagination && transactionPagination.total > 0 && (
              <div className="flex items-center justify-between mt-2 p-3 border rounded-md bg-muted">
                <div className="text-sm text-muted-foreground">
                  Showing {transactionHistory.length} of {transactionPagination.total} orders
                  (Page {transactionPagination.page} of {transactionPagination.pages})
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setHistoryPage(p => Math.max(1, p - 1))
                      setTimeout(handleFetchTransactionHistory, 100)
                    }}
                    disabled={transactionPagination.page === 1 || isFetchingHistory}
                  >
                    Previous
                  </Button>
                  <span className="text-sm px-2">Page {historyPage}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setHistoryPage(p => p + 1)
                      setTimeout(handleFetchTransactionHistory, 100)
                    }}
                    disabled={transactionPagination.page >= transactionPagination.pages || isFetchingHistory}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
            {transactionHistory.length > 0 && (
              <div className="mt-4 border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Request ID</TableHead>
                      <TableHead>Chain</TableHead>
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
                      {transactionHistory.map((tx) => {
                        const chainName = tx.chainId === 8453 ? 'Base' : tx.chainId === 1135 ? 'Lisk' : tx.chainId === 42220 ? 'Celo' : 'Unknown'
                        const chainIcon = tx.chainId === 8453 ? '🔵' : tx.chainId === 1135 ? '🟣' : tx.chainId === 42220 ? '🟡' : '⚪'
                        return (
                        <TableRow key={tx.txnHash}>
                          <TableCell className="font-semibold">{tx.orderId}</TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="font-mono text-xs cursor-help">
                                  {tx.requestId && tx.requestId.length > 10 ? `${tx.requestId.slice(0, 10)}...` : (tx.requestId || 'N/A')}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>{tx.requestId}</TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span>{chainIcon}</span>
                              <span className="font-medium">{chainName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <a
                                href={`${explorerUrl}/tx/${tx.txnHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline"
                              >
                                {tx.txnHash ? `${tx.txnHash.slice(0, 6)}...${tx.txnHash.slice(-4)}` : 'N/A'}
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
                                href={`${explorerUrl}/address/${tx.userWallet}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline"
                              >
                                {tx.userWallet ? `${tx.userWallet.slice(0, 6)}...${tx.userWallet.slice(-4)}` : 'N/A'}
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
                                href={`${explorerUrl}/token/${tx.tokenAddress}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline"
                              >
                                {tx.tokenAddress ? `${tx.tokenAddress.slice(0, 6)}...${tx.tokenAddress.slice(-4)}` : 'N/A'}
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
                          <TableCell>{tx.formattedAmount?.toFixed(6) || formatUnits(BigInt(tx.amount), 18)}</TableCell>
                          <TableCell>{tx.timestamp}</TableCell>
                          <TableCell>
                            {tx.orderId && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 bg-transparent"
                                    onClick={() => handleUseOrderId(tx.orderId!)}
                                  >
                                    <Copy className="h-4 w-4" />
                                    <span className="sr-only">Use Order ID</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Use this Order ID</TooltipContent>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      )})}
                    </TooltipProvider>
                  </TableBody>
                </Table>
              </div>
            )}
            {transactionHistory.length === 0 && !isFetchingHistory && historyAddress && (
              <p className="text-center text-muted-foreground">No transactions found for this address.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* New Main Platform History Card */}
      <Card>
        <CardHeader>
          <CardTitle>Main Platform Transaction History</CardTitle>
          <CardDescription>
            Displays application-level orders for a specific user, fetched from the main platform database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="main-platform-history-address">User Address</Label>
              <Input
                id="main-platform-history-address"
                placeholder="0x..."
                value={mainPlatformHistoryAddress}
                onChange={(e) => setMainPlatformHistoryAddress(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleFetchMainPlatformHistory} disabled={isFetchingMainPlatformHistory}>
                {isFetchingMainPlatformHistory ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fetching...
                  </>
                ) : (
                  "Fetch Main Platform History"
                )}
              </Button>
              {mainPlatformHistory.length > 0 && (
                <Button
                  onClick={handleExportMainPlatformHistory}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export to Excel
                </Button>
              )}
            </div>
            {mainPlatformHistory.length > 0 && (
              <div className="mt-4 border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request ID</TableHead>
                      <TableHead>Chain</TableHead>
                      <TableHead>Txn Hash</TableHead>
                      <TableHead>Service Type</TableHead>
                      <TableHead>Amount (₦)</TableHead>
                      <TableHead>Crypto Used</TableHead>
                      <TableHead>On-Chain Status</TableHead>
                      <TableHead>VTPass Status</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TooltipProvider delayDuration={0}>
                      {mainPlatformHistory.map((order) => {
                        const chainName = order.chainName || 'Unknown'
                        const chainIcon = chainName === 'Base' ? '🔵' : chainName === 'Lisk' ? '🟣' : chainName === 'Celo' ? '🟡' : '⚪'
                        return (
                        <TableRow key={order._id || order.requestId}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="font-mono text-xs cursor-help">
                                    {order.requestId && order.requestId.length > 12 ? `${order.requestId.slice(0, 12)}...` : (order.requestId || 'N/A')}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>{order.requestId}</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => handleCopy(order.requestId, "Request ID")}
                                  >
                                    <Copy className="h-3 w-3" />
                                    <span className="sr-only">Copy Request ID</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copy Request ID</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span>{chainIcon}</span>
                              <span className="font-medium">{chainName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <a
                                href={`${explorerUrl}/tx/${order.transactionHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline"
                              >
                                {order.transactionHash ? `${order.transactionHash.slice(0, 6)}...${order.transactionHash.slice(-4)}` : 'N/A'}
                              </a>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => handleCopy(order.transactionHash, "Transaction Hash")}
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
                            <span className="capitalize">{order.serviceType}</span>
                            {order.serviceID && (
                              <span className="text-xs text-muted-foreground block">
                                {order.serviceID}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-semibold">
                            ₦{order.amountNaira.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm">
                              {order.cryptoUsed.toFixed(6)} {order.cryptoSymbol}
                            </span>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(order.onChainStatus)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(order.vtpassStatus)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(order.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 bg-transparent"
                                    onClick={() => handleCopy(order.requestId, "Request ID")}
                                  >
                                    <Copy className="h-4 w-4" />
                                    <span className="sr-only">Copy Request ID</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copy Request ID</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      )})}
                    </TooltipProvider>
                  </TableBody>
                </Table>
              </div>
            )}
            {mainPlatformHistory.length === 0 && !isFetchingMainPlatformHistory && mainPlatformHistoryAddress && (
              <p className="text-center text-muted-foreground">No transactions found for this address on the main platform.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* User Analytics Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>User Analytics (Comprehensive)</CardTitle>
          <CardDescription>
            Get detailed analytics for a specific user including chain breakdown, token usage, and order statistics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="user-analytics-address">User Wallet Address</Label>
                <Input
                  id="user-analytics-address"
                  placeholder="0x..."
                  value={userAnalyticsAddress}
                  onChange={(e) => setUserAnalyticsAddress(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="w-[150px]">
                <Label htmlFor="user-analytics-timeframe">Timeframe</Label>
                <select
                  id="user-analytics-timeframe"
                  aria-label="Analytics timeframe"
                  title="Analytics timeframe"
                  value={userAnalyticsTimeframe}
                  onChange={(e) => setUserAnalyticsTimeframe(e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="month">Last Month</option>
                  <option value="year">Last Year</option>
                </select>
              </div>
            </div>
            <Button onClick={handleFetchUserAnalytics} disabled={isFetchingUserAnalytics}>
              {isFetchingUserAnalytics ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fetching Analytics...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" /> Fetch User Analytics
                </>
              )}
            </Button>

            {userAnalytics && (
              <div className="mt-4 space-y-4">
                {/* Stats Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 border rounded-md bg-muted">
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                    <p className="text-2xl font-bold">{userAnalytics.stats.orderCount}</p>
                  </div>
                  <div className="p-4 border rounded-md bg-muted">
                    <p className="text-sm text-muted-foreground">Total Volume</p>
                    <p className="text-2xl font-bold">{formatVolume(userAnalytics.stats.totalVolume)}</p>
                  </div>
                  <div className="p-4 border rounded-md bg-muted">
                    <p className="text-sm text-muted-foreground">Avg Amount</p>
                    <p className="text-2xl font-bold">${userAnalytics.stats.averageAmount.toFixed(2)}</p>
                  </div>
                  <div className="p-4 border rounded-md bg-muted">
                    <p className="text-sm text-muted-foreground">Chains Used</p>
                    <p className="text-2xl font-bold">{userAnalytics.stats.uniqueChains}</p>
                  </div>
                </div>

                {/* First/Last Order */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 border rounded-md">
                    <p className="text-sm text-muted-foreground">First Order</p>
                    <p className="font-medium">{new Date(userAnalytics.stats.firstOrder).toLocaleString()}</p>
                  </div>
                  <div className="p-3 border rounded-md">
                    <p className="text-sm text-muted-foreground">Last Order</p>
                    <p className="font-medium">{new Date(userAnalytics.stats.lastOrder).toLocaleString()}</p>
                  </div>
                </div>

                {/* Chain Breakdown */}
                {userAnalytics.chainBreakdown.length > 0 && (
                  <div className="border rounded-md p-4">
                    <h4 className="font-semibold mb-3">Chain Breakdown</h4>
                    <div className="space-y-2">
                      {userAnalytics.chainBreakdown.map((chain) => (
                        <div key={chain.chainId} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div className="flex items-center gap-2">
                            <span>{getChainIcon(chain.chainId)}</span>
                            <span className="font-medium">{chain.chainName}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-medium">{chain.orderCount} orders</span>
                            <span className="text-muted-foreground ml-2">({formatVolume(chain.totalVolume)})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Token Breakdown */}
                {userAnalytics.tokenBreakdown.length > 0 && (
                  <div className="border rounded-md p-4">
                    <h4 className="font-semibold mb-3">Token Breakdown</h4>
                    <div className="space-y-2">
                      {userAnalytics.tokenBreakdown.map((token) => (
                        <div key={token.cryptoSymbol} className="flex items-center justify-between p-2 bg-muted rounded">
                          <span className="font-semibold text-lg">
                            {token.cryptoSymbol}
                          </span>
                          <div className="text-right">
                            <span className="font-medium">{token.orderCount} orders</span>
                            <span className="text-muted-foreground ml-2">({formatVolume(token.totalVolume)})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Orders */}
                {userAnalytics.recentOrders.length > 0 && (
                  <div className="border rounded-md p-4">
                    <h4 className="font-semibold mb-3">Recent Orders</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Chain</TableHead>
                          <TableHead>Token</TableHead>
                          <TableHead>Service</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Timestamp</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userAnalytics.recentOrders.slice(0, 10).map((order) => (
                          <TableRow key={order.orderId}>
                            <TableCell className="font-mono text-xs">{order.orderId}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                <span>{getChainIcon(order.chainId)}</span>
                                {order.chainName}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{order.cryptoSymbol}</TableCell>
                            <TableCell className="capitalize">{order.serviceType}</TableCell>
                            <TableCell>${order.amount.toFixed(2)}</TableCell>
                            <TableCell>{new Date(order.timestamp).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}