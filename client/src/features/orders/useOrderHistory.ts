import { useEffect, useState } from 'react'
import { shoppingApi, type CustomerOrder } from '../../services/shoppingApi'

export function useOrderHistory() {
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)

  useEffect(() => {
    let active = true

    void shoppingApi.getOrderHistory()
      .then((customerOrders) => {
        if (active) setOrders(customerOrders)
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'We could not load your order history.',
          )
        }
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [requestVersion])

  function retry() {
    setIsLoading(true)
    setError(null)
    setRequestVersion((version) => version + 1)
  }

  return { orders, isLoading, error, retry }
}
