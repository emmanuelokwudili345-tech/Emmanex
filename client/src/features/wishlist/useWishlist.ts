import { createContext, useContext } from 'react'
import type { CatalogProduct } from '../../services/catalogApi'

export type WishlistContextValue = {
  items: CatalogProduct[]
  isLoading: boolean
  loadError: string | null
  isSaved: (productId: string) => boolean
  toggleItem: (product: CatalogProduct) => Promise<boolean>
  refreshWishlist: () => Promise<void>
}

export const WishlistContext = createContext<WishlistContextValue | null>(null)

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (!context) throw new Error('useWishlist must be used within WishlistProvider.')
  return context
}
