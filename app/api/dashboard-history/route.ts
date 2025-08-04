import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const timeframe = searchParams.get("timeframe") || "7d" // Default to 7 days

  const numDays = timeframe === "30d" ? 30 : 7
  const data = []
  let currentVolume = 100000 // Starting simulated volume
  let currentOrderCounter = 500 // Starting simulated order counter

  for (let i = numDays - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateString = date.toISOString().split("T")[0]

    // Simulate daily changes
    const dailyVolumeChange = Math.random() * 5000 - 2500 // +/- 2500
    currentVolume = Math.max(0, currentVolume + dailyVolumeChange) // Ensure volume doesn't go negative

    const dailyNewOrders = Math.floor(Math.random() * 20) + 5 // 5-24 new orders
    currentOrderCounter += dailyNewOrders

    const successfulRatio = Math.random() * 0.2 + 0.7 // 70-90% successful
    const successful = Math.round(dailyNewOrders * successfulRatio)
    const failed = dailyNewOrders - successful

    data.push({
      date: dateString,
      totalVolume: Number.parseFloat(currentVolume.toFixed(2)),
      successfulOrders: successful,
      failedOrders: failed,
      orderCounter: currentOrderCounter,
    })
  }

  return NextResponse.json(data)
}
