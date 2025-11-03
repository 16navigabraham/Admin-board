"use client"

import { toast } from "sonner"

/**
 * Paycrypt API Client
 * Complete integration for frontend applications
 */
class PaycryptAPIClient {
  baseURL: string
  token: string | null

  constructor(baseURL: string) {
    this.baseURL = baseURL
    this.token = null // Token will be set after login or retrieved from localStorage
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('paycrypt_token')
    }
  }

  setToken(token: string) {
    this.token = token
    if (typeof window !== 'undefined') {
      localStorage.setItem('paycrypt_token', token)
      // Also store in cookies for server-side access
      document.cookie = `paycrypt_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
    }
  }

  getStoredToken(): string | null {
    if (typeof window !== 'undefined') {
      // Try localStorage first
      const localToken = localStorage.getItem('paycrypt_token')
      if (localToken) return localToken
      
      // Fallback to cookies
      const cookieMatch = document.cookie.match(/paycrypt_token=([^;]+)/)
      return cookieMatch ? cookieMatch[1] : null
    }
    return null
  }

  clearToken() {
    this.token = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('paycrypt_token')
      // Also clear the cookie
      document.cookie = 'paycrypt_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    }
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    const currentToken = this.token || this.getStoredToken()
    if (currentToken) {
      headers.Authorization = `Bearer ${currentToken}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      return response.json()
    } catch (error) {
      console.error(`API Request failed: ${endpoint}`, error)
      throw error
    }
  }

  // Authentication Methods
  async login(email: string, password: string) {
    const response = await this.request('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    if (response.token) {
      this.setToken(response.token)
    }
    return response
  }

  async logout() {
    try {
      await this.request('/api/admin/logout', { method: 'POST' })
    } finally {
      this.clearToken()
    }
  }

  async forgotPassword(email: string) {
    return this.request('/api/admin/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  }

  async resetPassword(token: string, newPassword: string) {
    return this.request('/api/admin/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    })
  }

  isAuthenticated() {
    return !!(this.token || this.getStoredToken())
  }
}

// Singleton instance for client-side use
const paycryptAPI = new PaycryptAPIClient(process.env.NEXT_PUBLIC_BACKEND_API_URL || 'https://paycrypt-admin-backend.onrender.com')

export { paycryptAPI }
