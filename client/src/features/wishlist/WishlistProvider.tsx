import {
  useCallback, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react'
import { useAuth } from '../../auth/useAuth'
import type { CatalogProduct } from '../../services/catalogApi'
import { shoppingApi } from '../../services/shoppingApi'
import { WishlistContext, type WishlistContextValue } from './useWishlist'

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { status, user } = useAuth()
  const userId = user?.id
  const [items, setItems] = useState<CatalogProduct[]>([])
  const itemsRef = useRef<CatalogProduct[]>([])
  const mutationQueue = useRef<Promise<void>>(Promise.resolve())
  const mutationVersion = useRef(0)
  const loadVersion = useRef(0)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let active = true
    if (status === 'loading') return () => { active = false }
    if (status !== 'authenticated' || !userId) {
      loadVersion.current += 1
      void Promise.resolve().then(() => {
        if (!active) return
        itemsRef.current = []
        setItems([])
        setIsLoading(false)
      })
      return () => { active = false }
    }

    const versionAtStart = mutationVersion.current
    const requestVersion = ++loadVersion.current
    void shoppingApi.getWishlist()
      .then((nextItems) => {
        if (!active || mutationVersion.current !== versionAtStart || loadVersion.current !== requestVersion) return
        itemsRef.current = nextItems
        setItems(nextItems)
      })
      .catch(() => {
        if (active) {
          itemsRef.current = []
          setItems([])
        }
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => { active = false }
  }, [status, userId])

  const isSaved = useCallback(
    (productId: string) => items.some((item) => item.id === productId),
    [items],
  )

  const toggleItem = useCallback((product: CatalogProduct) => {
    mutationVersion.current += 1
    const operation = mutationQueue.current.then(async () => {
      const wasSaved = itemsRef.current.some((item) => item.id === product.id)
      if (wasSaved) {
        await shoppingApi.removeWishlistItem(product.id)
        const nextItems = itemsRef.current.filter((item) => item.id !== product.id)
        itemsRef.current = nextItems
        setItems(nextItems)
      } else {
        await shoppingApi.addWishlistItem(product.id)
        const nextItems = itemsRef.current.some((item) => item.id === product.id)
          ? itemsRef.current
          : [...itemsRef.current, product]
        itemsRef.current = nextItems
        setItems(nextItems)
      }
      return !wasSaved
    })
    mutationQueue.current = operation.then(() => undefined, () => undefined)
    return operation
  }, [])

  const value = useMemo<WishlistContextValue>(() => ({ items, isLoading, isSaved, toggleItem }), [items, isLoading, isSaved, toggleItem])
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}
