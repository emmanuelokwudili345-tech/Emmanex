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
  const mutationQueue = useRef<Promise<void>>(Promise.resolve())
  const mutationVersion = useRef(0)
  const loadVersion = useRef(0)
  const [isLoading, setIsLoading] = useState(true)

  const refreshCart = useCallback(async () => {
    if (status === 'loading') return
    if (status === 'error') { setIsLoading(false); return }
    setIsLoading(true)
    const versionAtStart = mutationVersion.current
    const requestVersion = ++loadVersion.current
    try {
      const nextItems = await shoppingApi.getCart()
      if (mutationVersion.current === versionAtStart && loadVersion.current === requestVersion) setItems(nextItems)
    } finally {
      setIsLoading(false)
    }
  }, [status])

  // Load data asynchronously in the effect; do not synchronously update state from its body.
  useEffect(() => {
    if (status === 'loading') return
    let active = true
    if (status === 'error') {
      void Promise.resolve().then(() => { if (active) setIsLoading(false) })
      return () => { active = false }
    }
    const versionAtStart = mutationVersion.current
    const requestVersion = ++loadVersion.current
    void shoppingApi.getCart()
      .then((nextItems) => {
        if (active && mutationVersion.current === versionAtStart && loadVersion.current === requestVersion) setItems(nextItems)
      })
      .catch(() => {
        if (active) setItems([])
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => { active = false }
  }, [status, userId])

  const runMutation = useCallback(<T,>(operation: () => Promise<T>) => {
    mutationVersion.current += 1
    const result = mutationQueue.current.then(operation)
    mutationQueue.current = result.then(() => undefined, () => undefined)
    return result
  }, [])

  const addItem = useCallback((product: CatalogProduct, quantity = 1) =>
    runMutation(async () => {
      const nextItems = await shoppingApi.addCartItem(product.id, quantity)
      setItems(nextItems)
    }), [runMutation])

  const removeItem = useCallback((productId: string) =>
    runMutation(async () => {
      setItems(await shoppingApi.removeCartItem(productId))
    }), [runMutation])

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (!Number.isInteger(quantity) || quantity < 1) return Promise.resolve()
    return runMutation(async () => {
      setItems(await shoppingApi.updateCartItem(productId, quantity))
    })
  }, [runMutation])

  const value = useMemo<CartContextValue>(() => {
    const itemCount = items.reduce((total, item) => total + item.quantity, 0)
    const subtotal = items.reduce((total, item) => total + Number(item.product.price) * item.quantity, 0)
    return { items, itemCount, subtotal, isLoading, addItem, removeItem, updateQuantity, refreshCart }
  }, [items, isLoading, addItem, removeItem, updateQuantity, refreshCart])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
