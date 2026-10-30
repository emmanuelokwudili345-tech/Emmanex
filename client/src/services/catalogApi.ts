interface ApiEnvelope<T> {
  status: 'success'
  message: string
  data: T
}

interface ApiErrorEnvelope {
  status?: 'error'
  message?: string
}

export interface CatalogCategory {
  id: string
  name: string
  slug: string
  description: string | null
}

export interface CatalogProduct {
  id: string
  name: string
  slug: string
  description: string | null
  price: string
  imageUrl: string | null
  category: {
    id: string
    name: string
    slug: string
  } | null
  inStock: boolean
}

export interface ProductPage {
  products: CatalogProduct[]
  pagination: {
    page: number
    limit: number
    hasMore: boolean
  }
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, { signal })
  const body = (await response.json().catch(() => null)) as
    | ApiEnvelope<T>
    | ApiErrorEnvelope
    | null

  if (!response.ok || !body || body.status !== 'success') {
    const errorBody = body as ApiErrorEnvelope | null
    throw new Error(errorBody?.message || 'We could not load the store right now.')
  }

  return body.data
}

export const catalogApi = {
  async getCategories(signal?: AbortSignal): Promise<CatalogCategory[]> {
    const data = await get<{ categories: CatalogCategory[] }>(
      '/categories',
      signal,
    )
    return data.categories
  },

  async getProducts(options: {
    page: number
    limit: number
    search?: string
    categorySlug?: string
    signal?: AbortSignal
  }): Promise<ProductPage> {
    const query = new URLSearchParams({
      page: String(options.page),
      limit: String(options.limit),
    })

    if (options.search?.trim()) query.set('search', options.search.trim())

    const path = options.categorySlug
      ? `/categories/${encodeURIComponent(options.categorySlug)}/products?${query}`
      : `/products?${query}`

    const data = await get<{
      products: CatalogProduct[]
      pagination: ProductPage['pagination']
    }>(path, options.signal)

    return data
  },
}
