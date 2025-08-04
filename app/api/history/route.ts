import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userAddress = searchParams.get("userAddress")

  if (!userAddress) {
    return NextResponse.json({ error: "User address is required" }, { status: 400 })
  }

  try {
    // Hardcoded backend API URL as requested
    const backendApiUrl = "https://wagmicharge-backend.onrender.com"
    const response = await fetch(`${backendApiUrl}/api/history?userAddress=${userAddress}`)

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { error: errorData.error || "Failed to fetch transactions from backend" },
        { status: response.status },
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 })
  }
}
