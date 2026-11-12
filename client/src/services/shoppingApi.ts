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

export interface ShoppingCartData {
  items: ShoppingCartItem[]
  summary: {
    subtotal: string
  }
}

export interface ShippingOption {
  state: string
  zone: string
  shippingFee: string
}

export interface CheckoutDetails {
  recipientName: string
  phone: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  postalCode: string
  demoOutcome: 'success' | 'failure'
}

export interface OrderConfirmation {
  id: string
  status: 'pending'
  isDemo: true
  subtotal: string
  shippingFee: string
  total: string
  createdAt: string
  items: Array<{
    productName: string
    unitPrice: string
    quantity: number
    lineTotal: string
  }>
}

export interface CustomerOrder {
  id: string
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  isDemo: boolean
  subtotal: string
  shippingFee: string
  total: string
  createdAt: string
  items: OrderConfirmation['items']
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
  async getCart(): Promise<ShoppingCartData> {
    return request<ShoppingCartData>('/cart')
  },
  async addCartItem(productId: string, quantity = 1): Promise<ShoppingCartData> {
    return request<ShoppingCartData>('/cart/items', {
      method: 'POST', 
      body: JSON.stringify({ productId, quantity }),
    })
  },
  async updateCartItem(productId: string, quantity: number): Promise<ShoppingCartData> {
    return request<ShoppingCartData>(`/cart/items/${encodeURIComponent(productId)}`, {
      method: 'PATCH', 
      body: JSON.stringify({ quantity }),
    })
  },
  async removeCartItem(productId: string): Promise<ShoppingCartData> {
    return request<ShoppingCartData>(`/cart/items/${encodeURIComponent(productId)}`, { method: 'DELETE' })
  },
  async getWishlist(): Promise<CatalogProduct[]> {
    const data = await request<{ items: CatalogProduct[] }>('/wishlist')
    return data.items
  },
  async addWishlistItem(productId: string): Promise<void> {
    await request('/wishlist/items', { 
      method: 'POST', 
      body: JSON.stringify({ productId }) })
  },
  async removeWishlistItem(productId: string): Promise<void> {
    await request(`/wishlist/items/${encodeURIComponent(productId)}`, { method: 'DELETE' })
  },
  async getShippingOptions(): Promise<ShippingOption[]> {
    const data = await request<{ options: ShippingOption[] }>('/shipping/options')
    return data.options
  },
  async getOrderHistory(): Promise<CustomerOrder[]> {
    const data = await request<{ orders: CustomerOrder[] }>('/orders')
    return data.orders
  },
  async submitDemoOrder(details: CheckoutDetails): Promise<OrderConfirmation> {
    const data = await request<{ order: OrderConfirmation }>('/orders', {
      method: 'POST',
      body: JSON.stringify(details),
    })
    return data.order
  },
}
