export type StoreCategory = {
  id: string
  name: string
  description: string
  image: string
}

export type StoreProduct = {
  id: string
  name: string
  category: string
  price: number
  previousPrice?: number
  rating: number
  reviews: number
  label?: string
  image: string
  imageAlt: string
}

function getImageUrl(imageId: string, width = 900): string {
  return `https://images.unsplash.com/${imageId}?auto=format&fit=crop&w=${width}&q=85`
}

export const mockCategories: StoreCategory[] = [
  {
    id: 'fashion',
    name: 'Fashion & accessories',
    description: 'The finishing touches',
    image: getImageUrl('photo-1483985988355-763728e1935b', 800),
  },
  {
    id: 'electronics',
    name: 'Tech & electronics',
    description: 'Smart everyday essentials',
    image: getImageUrl('photo-1498049794561-7780e7231661', 800),
  },
  {
    id: 'beauty',
    name: 'Beauty & self-care',
    description: 'A little time for you',
    image: getImageUrl('photo-1608248543803-ba4f8c70ae0b', 800),
  },
  {
    id: 'home',
    name: 'Home & living',
    description: 'Make yourself at home',
    image: getImageUrl('photo-1616486338812-3dadae4b4ace', 800),
  },
  {
    id: 'lifestyle',
    name: 'Lifestyle & more',
    description: 'Good things for every day',
    image: getImageUrl('photo-1490481651871-ab68de25d43d', 800),
  },
]

export const mockProducts: StoreProduct[] = [
  {
    id: 'everyday-tote',
    name: 'Everyday canvas tote',
    category: 'fashion',
    price: 18500,
    previousPrice: 22000,
    rating: 4.8,
    reviews: 124,
    label: 'Bestseller',
    image: getImageUrl('photo-1544816155-12df9643f363'),
    imageAlt: 'Neutral canvas tote bag on a clean background',
  },
  {
    id: 'wireless-headphones',
    name: 'Studio wireless headphones',
    category: 'electronics',
    price: 68500,
    rating: 4.9,
    reviews: 86,
    label: 'Popular',
    image: getImageUrl('photo-1505740420928-5e560c06d30e'),
    imageAlt: 'Premium wireless headphones in a studio setting',
  },
  {
    id: 'daily-glow-set',
    name: 'Daily glow skincare set',
    category: 'beauty',
    price: 24500,
    previousPrice: 29000,
    rating: 4.7,
    reviews: 58,
    label: 'Save 15%',
    image: getImageUrl('photo-1608248543803-ba4f8c70ae0b'),
    imageAlt: 'Skincare bottles arranged in soft natural light',
  },
  {
    id: 'ceramic-vase',
    name: 'Sculpted ceramic vase',
    category: 'home',
    price: 19800,
    rating: 4.8,
    reviews: 42,
    image: getImageUrl('photo-1578500494198-246f612d3b3d'),
    imageAlt: 'Minimal ceramic vase for a modern home',
  },
  {
    id: 'classic-sneakers',
    name: 'Classic everyday sneakers',
    category: 'fashion',
    price: 42000,
    rating: 4.6,
    reviews: 91,
    label: 'Just in',
    image: getImageUrl('photo-1542291026-7eec264c27ff'),
    imageAlt: 'Modern everyday sneakers photographed from the side',
  },
  {
    id: 'smart-watch',
    name: 'Essential smart watch',
    category: 'electronics',
    price: 79500,
    previousPrice: 89000,
    rating: 4.7,
    reviews: 73,
    image: getImageUrl('photo-1523275335684-37898b6baf30'),
    imageAlt: 'Minimal wristwatch on a light background',
  },
  {
    id: 'soft-throw',
    name: 'Soft woven throw',
    category: 'home',
    price: 32500,
    rating: 4.9,
    reviews: 37,
    image: getImageUrl('photo-1600210492486-724fe5c67fb0'),
    imageAlt: 'Soft neutral textiles in a cosy living room',
  },
  {
    id: 'travel-bottle',
    name: 'Insulated travel bottle',
    category: 'lifestyle',
    price: 12500,
    rating: 4.5,
    reviews: 65,
    label: 'Everyday pick',
    image: getImageUrl('photo-1602143407151-7111542de6e8'),
    imageAlt: 'Reusable water bottle on a simple background',
  },
]

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount)
}