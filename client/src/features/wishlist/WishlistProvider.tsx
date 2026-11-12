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
  const itemsUserId = useRef<string | null>(null)
  const mutationQueue = useRef<Promise<void>>(Promise.resolve())
  const mutationVersion = useRef(0)
  const loadVersion = useRef(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const refreshWishlist = useCallback(async () => {
    if (status !== 'authenticated' || !userId) return

    if (itemsUserId.current !== userId) {
      itemsUserId.current = userId
      itemsRef.current = []
      setItems([])
    }

    setIsLoading(true)
    setLoadError(null)
    const versionAtStart = mutationVersion.current
    const requestVersion = ++loadVersion.current

    try {
      const nextItems = await shoppingApi.getWishlist()
      if (mutationVersion.current === versionAtStart && loadVersion.current === requestVersion) {
        itemsUserId.current = userId
        itemsRef.current = nextItems
        setItems(nextItems)
      }
    } catch (error) {
      if (loadVersion.current === requestVersion) {
        setLoadError(error instanceof Error ? error.message : 'We could not load your wishlist.')
      }
      throw error
    } finally {
      if (loadVersion.current === requestVersion) setIsLoading(false)
    }
  }, [status, userId])

  useEffect(() => {
    let active = true
    if (status === 'loading') return () => { active = false }
    if (status !== 'authenticated' || !userId) {
      loadVersion.current += 1
      void Promise.resolve().then(() => {
        if (!active) return
        itemsUserId.current = null
        itemsRef.current = []
        setItems([])
        setLoadError(null)
        setIsLoading(false)
      })
      return () => { active = false }
    }

    void Promise.resolve().then(() => {
      if (active) return refreshWishlist()
    }).catch(() => undefined)
    return () => {
      active = false
      loadVersion.current += 1
    }
  }, [status, userId, refreshWishlist])

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
      setLoadError(null)
      return !wasSaved
    })
    mutationQueue.current = operation.then(() => undefined, () => undefined)
    return operation
  }, [])

  const value = useMemo<WishlistContextValue>(() => ({ items, isLoading, loadError, isSaved, toggleItem, refreshWishlist }), [items, isLoading, loadError, isSaved, toggleItem, refreshWishlist])
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}
