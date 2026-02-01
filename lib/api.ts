export async function getUserHistory(userAddress: string, page: number = 1, limit: number = 50) {
  const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

  // Using the specified endpoint structure: /api/orders/user/:userWallet with pagination
  const params = new URLSearchParams({
    page: page.toString(),
    limit: Math.min(limit, 100).toString() // Max 100 per API docs
  });
  
  const res = await fetch(`${BASE_URL}/api/orders/user/${userAddress}?${params}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({})); // Safely parse error data
    throw new Error(errorData.error || `Failed to fetch history from backend: HTTP ${res.status}`);
  }
  const data = await res.json();
  // The backend's /api/orders/user/:userWallet endpoint returns { userWallet, orders, pagination }
  if (data && Array.isArray(data.orders)) {
    return data; // Return full response including pagination
  } else {
    throw new Error("Invalid response format: 'orders' array not found.");
  }
}
