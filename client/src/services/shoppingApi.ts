import { getNeonJWTToken } from '../auth/neonAuthClient'
import type { CatalogProduct } from './catalogApi'

interface ApiEnvelope<T> {
  status: 'success'
  message: string
  data: T
}

interface ApiErrorEnvelope {
  message?: string
}

export interface ShoppingCartItem {
  product: CatalogProduct
  quantity: number
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getNeonJWTToken()
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })
  const body = await response.json().catch(() => null) as ApiEnvelope<T> | ApiErrorEnvelope | null
  if (!response.ok || !body || !('status' in body) || body.status !== 'success') {
    throw new Error((body as ApiErrorEnvelope | null)?.message || 'We could not update your shopping data.')
  }
  return body.data
}

export const shoppingApi = {
  async getCart(): Promise<ShoppingCartItem[]> {
    const data = await request<{ items: ShoppingCartItem[] }>('/cart')
    return data.items
  },
  async addCartItem(productId: string, quantity = 1): Promise<ShoppingCartItem[]> {
    const data = await request<{ items: ShoppingCartItem[] }>('/cart/items', {
      method: 'POST', body: JSON.stringify({ productId, quantity }),
    })
    return data.items
  },
  async updateCartItem(productId: string, quantity: number): Promise<ShoppingCartItem[]> {
    const data = await request<{ items: ShoppingCartItem[] }>(`/cart/items/${encodeURIComponent(productId)}`, {
      method: 'PATCH', body: JSON.stringify({ quantity }),
    })
    return data.items
  },
  async removeCartItem(productId: string): Promise<ShoppingCartItem[]> {
    const data = await request<{ items: ShoppingCartItem[] }>(`/cart/items/${encodeURIComponent(productId)}`, { method: 'DELETE' })
    return data.items
  },
  async getWishlist(): Promise<CatalogProduct[]> {
    const data = await request<{ items: CatalogProduct[] }>('/wishlist')
    return data.items
  },
  async addWishlistItem(productId: string): Promise<void> {
    await request('/wishlist/items', { method: 'POST', body: JSON.stringify({ productId }) })
  },
  async removeWishlistItem(productId: string): Promise<void> {
    await request(`/wishlist/items/${encodeURIComponent(productId)}`, { method: 'DELETE' })
  },
}
