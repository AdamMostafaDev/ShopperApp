export interface Product {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviewCount: number;
  url: string;
  store: 'amazon' | 'walmart' | 'ebay';
  description?: string;
  features?: string[];
  availability: 'in_stock' | 'out_of_stock' | 'limited';
}

export interface CartItem {
  product: Product;
  quantity: number;
  addedAt: Date;
}

export interface Cart {
  items: CartItem[];
  total: number;
  itemCount: number;
}

export interface SearchFilters {
  store?: 'amazon' | 'walmart' | 'ebay' | 'all';
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  category?: string;
  sortBy?: 'relevance' | 'price_low' | 'price_high' | 'rating' | 'newest';
}

export interface BestSeller {
  category: string;
  products: Product[];
}
