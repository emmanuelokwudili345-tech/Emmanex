import { createContext, useContext } from 'react'
import type { CatalogProduct } from '../../services/catalogApi'
import type { ShoppingCartItem } from '../../services/shoppingApi'

export type CartItem = ShoppingCartItem

export type CartContextValue = {
  items: CartItem[]
  itemCount: number
  subtotal: string
  isLoading: boolean
  loadError: string | null
  addItem: (product: CatalogProduct, quantity?: number) => Promise<void>
  removeItem: (productId: string) => Promise<void>
  updateQuantity: (productId: string, quantity: number) => Promise<void>
  refreshCart: () => Promise<void>
}

export const CartContext = createContext<CartContextValue | null>(null)

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within CartProvider.')
  return context
}
