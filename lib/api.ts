export async function getUserHistory(userAddress: string) {
  // Hardcoded backend API URL as requested
  const BASE_URL = "https://wagmicharge-backend.onrender.com"

  // Using the specified endpoint structure: /api/history?userAddress=...
  const res = await fetch(`${BASE_URL}/api/history?userAddress=${userAddress}`)
  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.error || "Failed to fetch history from backend")
  }
  return await res.json()
}
