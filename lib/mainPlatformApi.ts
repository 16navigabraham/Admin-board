// Centralized main platform API configuration
// Use NEXT_PUBLIC_MAIN_PLATFORM_API_BASE for client-side-configurable base URL
// (Next.js replaces `process.env.*` at build time for front-end code)
export const MAIN_PLATFORM_API_BASE = process.env.NEXT_PUBLIC_MAIN_PLATFORM_API_BASE 

/**
 * API Key for main platform (Paycrypt Admin API)
 * Set NEXT_PUBLIC_PAYCRYPT_API_KEY in your environment
 */
export const PAYCRYPT_API_KEY = process.env.NEXT_PUBLIC_PAYCRYPT_API_KEY 

/**
 * Build a full URL for the main platform API.
 * @param path - endpoint path or path+query (leading slashes are ignored)
 */
export function mainPlatformApiUrl(path: string) {
  const trimmed = path.replace(/^\/+/, '')
  return `${MAIN_PLATFORM_API_BASE}${trimmed}`
}

/**
 * Build headers for main platform API requests.
 * Includes x-api-key header if PAYCRYPT_API_KEY is set.
 */
export function mainPlatformHeaders(additionalHeaders: Record<string, string> = {}): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...additionalHeaders,
  }

  if (PAYCRYPT_API_KEY) {
    headers['x-api-key'] = PAYCRYPT_API_KEY
  }

  return headers
}

/**
 * Fetch helper for main platform API with automatic auth headers.
 * @param path - API endpoint path (without base URL)
 * @param options - Additional fetch options
 * @throws Error if response is not ok
 * @returns Parsed JSON response
 */
export async function mainPlatformFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = mainPlatformApiUrl(path)
  const headers = mainPlatformHeaders(
    options.headers as Record<string, string> | undefined
  )

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(
      errorData.error || `API request failed: ${response.status} ${response.statusText}`
    )
  }

  return response.json()
}

export default {
  MAIN_PLATFORM_API_BASE,
  PAYCRYPT_API_KEY,
  mainPlatformApiUrl,
  mainPlatformHeaders,
  mainPlatformFetch,
}
