export async function getUserHistory(userAddress: string) {
  // Using the environment variable for the backend API URL
  const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL

  // Using the specified endpoint structure: /api/orders/user/:userWallet
  const res = await fetch(`${BASE_URL}/api/orders/user/${userAddress}`)
  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.error || "Failed to fetch history from backend")
  }
  const data = await res.json()
  // Extract the 'orders' array from the response
  if (data && Array.isArray(data.orders)) {
    return data.orders
  } else {
    throw new Error("Invalid response format: 'orders' array not found.")
  }
}
