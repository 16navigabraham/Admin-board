"use client"

import { CardDescription } from "@/components/ui/card"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "@/config/contract"
import {
  createPublicClient,
  http,
  decodeFunctionData,
  type Hex,
  formatUnits,
  decodeEventLog,
  keccak256,
  toBytes,
} from "viem"
import { base } from "viem/chains"
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Copy, Search } from "lucide-react"
import { getUserHistory } from "@/lib/api"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
})

interface DecodedTxnData {
  functionName: string
  args: any[]
}

interface TransactionHistoryItem {
  hash: string
  from: string
  to: string
  value: string
  timestamp: string
  decodedData?: DecodedTxnData
  logicalOrderId?: string // Client-side derived sequential order ID for createOrder txns
  actualOrderId?: string // Actual on-chain order ID from event decoding
  requestId?: string // Request ID from createOrder input
}

export default function ManageOrdersPage() {
  const [txnHash, setTxnHash] = useState<string>("")
  const [decodedData, setDecodedData] = useState<DecodedTxnData | null>(null)
  const [orderIdToProcess, setOrderIdToProcess] = useState<string>("")
  const [transactionHistory, setTransactionHistory] = useState<TransactionHistoryItem[]>([])
  const [isDecoding, setIsDecoding] = useState(false)
  const [isFetchingHistory, setIsFetchingHistory] = useState(false)
  const [historyAddress, setHistoryAddress] = useState<string>("")

  const [requestIdToDecode, setRequestIdToDecode] = useState<string>("")
  const [decodedRequestIdHash, setDecodedRequestIdHash] = useState<string | null>(null)
  const [foundTxnByRequestId, setFoundTxnByRequestId] = useState<TransactionHistoryItem | null>(null)
  const [isSearchingRequestId, setIsSearchingRequestId] = useState(false)

  const { data: hash, writeContract, isPending: isWriting, error: writeError } = useWriteContract()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

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
        decodedInput = { functionName, args }
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
              setOrderIdToProcess(foundActualOrderId)
              toast.success(`Transaction decoded and actual Order ID ${foundActualOrderId} found from event!`)
              return // Found the actual order ID, no need to check other logs
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
          setOrderIdToProcess(decodedInput.args[0].toString())
          toast.info("Using Request ID from input as a fallback for Order ID.")
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
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "markOrderSuccessful",
        args: [BigInt(orderIdToProcess)],
      })
      toast.info("Marking order successful...")
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
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "markOrderFailed",
        args: [BigInt(orderIdToProcess)],
      })
      toast.info("Marking order failed...")
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
    setTransactionHistory([])
    try {
      const rawData = await getUserHistory(historyAddress)
      let createOrderCounter = 0

      const historyPromises = rawData.map(async (tx: any) => {
        let decoded: DecodedTxnData | undefined
        let logicalOrderId: string | undefined = undefined // Client-side derived sequential order ID
        let requestId: string | undefined = undefined

        try {
          const { functionName, args } = decodeFunctionData({
            abi: CONTRACT_ABI,
            data: tx.input,
          })
          decoded = { functionName, args }

          // If it's a createOrder transaction, assign a logical order ID and extract requestId
          if (functionName === "createOrder") {
            createOrderCounter++
            logicalOrderId = createOrderCounter.toString()
            if (args && args.length > 0) {
              requestId = args[0].toString() // Assuming requestId is the first arg
            }
          }
        } catch (decodeError) {
          // Ignore decoding errors for non-contract transactions or unknown functions
          decoded = undefined
        }

        return {
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: formatUnits(BigInt(tx.value), 18), // Assuming ETH value for transaction value
          timestamp: new Date(tx.timestamp * 1000).toLocaleString(),
          decodedData: decoded,
          logicalOrderId: logicalOrderId,
          requestId: requestId,
        }
      })

      const resolvedHistory = await Promise.all(historyPromises)
      setTransactionHistory(resolvedHistory)
      toast.success("Transaction history fetched successfully!")
    } catch (error: any) {
      console.error("Error fetching transaction history:", error)
      toast.error(`Failed to fetch transaction history: ${error.message || error}`)
    } finally {
      setIsFetchingHistory(false)
    }
  }

  const handleDecodeRequestId = async () => {
    if (!requestIdToDecode) {
      toast.error("Please enter a Request ID.")
      return
    }
    setIsSearchingRequestId(true)
    setDecodedRequestIdHash(null)
    setFoundTxnByRequestId(null)

    try {
      // Convert the string requestId to bytes32 hash
      const hashedRequestId = keccak256(toBytes(requestIdToDecode))
      setDecodedRequestIdHash(hashedRequestId)
      toast.info(`Request ID hashed to: ${hashedRequestId}`)

      // In a real application, you would query a blockchain indexer (e.g., The Graph)
      // to find transactions by this hashedRequestId.
      // For this demo, we'll simulate finding it in the currently loaded history.
      const allCreateOrdersResponse = await fetch("/api/all-create-orders") // Fetch all create orders
      if (!allCreateOrdersResponse.ok) {
        throw new Error("Failed to fetch all create orders for search")
      }
      const allCreateOrders: TransactionHistoryItem[] = await allCreateOrdersResponse.json()

      const foundTx = allCreateOrders.find(
        (tx) =>
          tx.decodedData?.functionName === "createOrder" &&
          tx.decodedData.args &&
          tx.decodedData.args[0] === hashedRequestId, // Compare with the hashed requestId
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

  return (
    <div className="flex-1 p-4 md:p-8 overflow-auto">
      <h1 className="text-3xl font-bold mb-6">Order Tools</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Decode Transaction Input & Find Actual Order ID</CardTitle>
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
          <CardTitle>Decode Request ID & Find Transaction</CardTitle>
          <CardDescription>
            Convert a human-readable Request ID to its on-chain hash and find matching transactions.
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
            {decodedRequestIdHash && (
              <div className="mt-4 p-4 border rounded-md bg-muted">
                <h3 className="font-semibold">Hashed Request ID (bytes32):</h3>
                <p className="break-all font-mono text-sm">{decodedRequestIdHash}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Note: Finding transactions by Request ID on-chain typically requires a blockchain indexing service
                  (e.g., The Graph) that indexes contract input data. This tool simulates finding it within the fetched
                  "All Create Orders" history.
                </p>
                {foundTxnByRequestId && (
                  <div className="mt-4">
                    <h3 className="font-semibold">Matching Transaction Found:</h3>
                    <p>
                      <strong>Hash:</strong>{" "}
                      <a
                        href={`https://basescan.org/tx/${foundTxnByRequestId.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        {foundTxnByRequestId.hash.slice(0, 10)}...{foundTxnByRequestId.hash.slice(-8)}
                      </a>
                    </p>
                    <p>
                      <strong>Function:</strong> {foundTxnByRequestId.decodedData?.functionName}
                    </p>
                    <p>
                      <strong>Logical Order ID:</strong> {foundTxnByRequestId.logicalOrderId}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 bg-transparent"
                      onClick={() => handleUseOrderId(foundTxnByRequestId.logicalOrderId!)}
                    >
                      <Copy className="mr-2 h-4 w-4" /> Use this Logical Order ID
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
                  href={`https://basescan.org/tx/${hash}`}
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

      <Card>
        <CardHeader>
          <CardTitle>Transaction History (User Specific)</CardTitle>
          <CardDescription>
            Displays transactions for a specific user, with logical Order IDs for 'createOrder' calls.
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
              <div className="mt-4 border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hash</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Value (ETH)</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Decoded Function</TableHead>
                      <TableHead>Order ID (Logical)</TableHead>
                      <TableHead>Request ID</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TooltipProvider delayDuration={0}>
                      {transactionHistory.map((tx) => (
                        <TableRow key={tx.hash}>
                          <TableCell className="font-medium">
                            <a
                              href={`https://basescan.org/tx/${tx.hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline"
                            >
                              {tx.hash.slice(0, 6)}...{tx.hash.slice(-4)}
                            </a>
                          </TableCell>
                          <TableCell>
                            <a
                              href={`https://basescan.org/address/${tx.from}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline"
                            >
                              {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                            </a>
                          </TableCell>
                          <TableCell>
                            <a
                              href={`https://basescan.org/address/${tx.to}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline"
                            >
                              {tx.to.slice(0, 6)}...{tx.to.slice(-4)}
                            </a>
                          </TableCell>
                          <TableCell>{tx.value}</TableCell>
                          <TableCell>{tx.timestamp}</TableCell>
                          <TableCell>
                            {tx.decodedData
                              ? `${tx.decodedData.functionName}(${tx.decodedData.args
                                  .map((arg) => (typeof arg === "bigint" ? arg.toString() : JSON.stringify(arg)))
                                  .join(", ")})`
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {tx.logicalOrderId ? <span className="font-semibold">{tx.logicalOrderId}</span> : "N/A"}
                          </TableCell>
                          <TableCell>
                            {tx.requestId ? (
                              <span className="font-mono text-xs">{tx.requestId.slice(0, 6)}...</span>
                            ) : (
                              "N/A"
                            )}
                          </TableCell>
                          <TableCell>
                            {tx.logicalOrderId && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 bg-transparent"
                                    onClick={() => handleUseOrderId(tx.logicalOrderId!)}
                                  >
                                    <Copy className="h-4 w-4" />
                                    <span className="sr-only">Use Logical Order ID</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Use this Logical Order ID</TooltipContent>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
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
    </div>
  )
}
