import {
  useCallback, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react'
import { useAuth } from '../../auth/useAuth'
import type { CatalogProduct } from '../../services/catalogApi'
import { shoppingApi } from '../../services/shoppingApi'
import { CartContext, type CartContextValue, type CartItem } from './useCart'

export function CartProvider({ children }: { children: ReactNode }) {
  const { status, user } = useAuth()
  const userId = user?.id
  const [items, setItems] = useState<CartItem[]>([])
  const [subtotal, setSubtotal] = useState('0.00')
  const mutationQueue = useRef<Promise<void>>(Promise.resolve())
  const mutationVersion = useRef(0)
  const loadVersion = useRef(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const refreshCart = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    const versionAtStart = mutationVersion.current
    const requestVersion = ++loadVersion.current
    try {
      const nextCart = await shoppingApi.getCart()
      if (mutationVersion.current === versionAtStart && loadVersion.current === requestVersion) {
        setItems(nextCart.items)
        setSubtotal(nextCart.summary.subtotal)
      }
    } catch (error) {
      if (loadVersion.current === requestVersion) {
        setLoadError(error instanceof Error ? error.message : 'We could not load your shopping bag.')
      }
      throw error
    } finally {
      if (loadVersion.current === requestVersion) setIsLoading(false)
    }
  }, [])

  // Load data asynchronously in the effect; do not synchronously update state from its body.
  useEffect(() => {
    if (status === 'loading') return
    let active = true
    void Promise.resolve().then(() => {
      if (active) return refreshCart()
    }).catch(() => undefined)
    return () => {
      active = false
      loadVersion.current += 1
    }
  }, [status, userId, refreshCart])

  const runMutation = useCallback(<T,>(operation: () => Promise<T>) => {
    mutationVersion.current += 1
    const result = mutationQueue.current.then(operation)
    mutationQueue.current = result.then(() => {
      setLoadError(null)
    }, () => undefined)
    return result
  }, [])

  const addItem = useCallback((product: CatalogProduct, quantity = 1) =>
    runMutation(async () => {
      const nextCart = await shoppingApi.addCartItem(product.id, quantity)
      setItems(nextCart.items)
      setSubtotal(nextCart.summary.subtotal)
    }), [runMutation])

  const removeItem = useCallback((productId: string) =>
    runMutation(async () => {
      const nextCart = await shoppingApi.removeCartItem(productId)
      setItems(nextCart.items)
      setSubtotal(nextCart.summary.subtotal)
    }), [runMutation])

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (!Number.isInteger(quantity) || quantity < 1) return Promise.resolve()
    return runMutation(async () => {
      const nextCart = await shoppingApi.updateCartItem(productId, quantity)
      setItems(nextCart.items)
      setSubtotal(nextCart.summary.subtotal)
    })
  }, [runMutation])

  const value = useMemo<CartContextValue>(() => {
    const itemCount = items.reduce((total, item) => total + item.quantity, 0)
    return { items, itemCount, subtotal, isLoading, loadError, addItem, removeItem, updateQuantity, refreshCart }
  }, [items, subtotal, isLoading, loadError, addItem, removeItem, updateQuantity, refreshCart])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
