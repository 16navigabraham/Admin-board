export async function getUserHistory(userAddress: string) {
  const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

  // Using the specified endpoint structure: /api/orders/user/:userWallet
  const res = await fetch(`${BASE_URL}/api/orders/user/${userAddress}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({})); // Safely parse error data
    throw new Error(errorData.error || `Failed to fetch history from backend: HTTP ${res.status}`);
  }
  const data = await res.json();
  // The backend's /api/orders/user/:userWallet endpoint returns { orders: Order[], ... }
  if (data && Array.isArray(data.orders)) {
    return data.orders;
  } else {
    throw new Error("Invalid response format: 'orders' array not found.");
  }
}
