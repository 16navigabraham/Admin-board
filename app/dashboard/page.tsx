import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Package, XCircle, CheckCircle } from "lucide-react"
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "@/config/contract"
import { createPublicClient, http, formatUnits } from "viem"
import { base } from "viem/chains"

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
})

async function getDashboardStats() {
  try {
    const [totalVolume, totalSuccessfulOrders, totalFailedOrders, orderCounter] = await Promise.all([
      publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "getTotalVolume",
      }),
      publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "getTotalSuccessfulOrders",
      }),
      publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "getTotalFailedOrders",
      }),
      publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "getOrderCounter",
      }),
    ])

    // Assuming a default 18 decimals for volume if not specified by a token
    const formattedTotalVolume = formatUnits(totalVolume as bigint, 18)

    return {
      totalVolume: formattedTotalVolume,
      totalSuccessfulOrders: totalSuccessfulOrders.toString(),
      totalFailedOrders: totalFailedOrders.toString(),
      orderCounter: orderCounter.toString(),
    }
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return {
      totalVolume: "N/A",
      totalSuccessfulOrders: "N/A",
      totalFailedOrders: "N/A",
      orderCounter: "N/A",
    }
  }
}

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  return (
    <div className="flex-1 p-4 md:p-8 overflow-auto">
      <h1 className="text-3xl font-bold mb-6">Dashboard Overview</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVolume}</div>
            <p className="text-xs text-muted-foreground">Total value processed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful Orders</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSuccessfulOrders}</div>
            <p className="text-xs text-muted-foreground">Orders marked successful</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Orders</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFailedOrders}</div>
            <p className="text-xs text-muted-foreground">Orders marked failed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Order Counter</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.orderCounter}</div>
            <p className="text-xs text-muted-foreground">Total orders created</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
