export interface Product {
  id: string;
  title: string;
  price: number; // BDT converted price
  originalPrice?: number; // BDT converted original price
  originalCurrency?: string; // USD, CAD, GBP, AUD
  originalPriceValue?: number; // Original price before conversion
  weight?: number; // Weight in kg for shipping calculation
  image: string;
  rating?: number;
  reviewCount?: number;
  url: string;
  store: 'amazon' | 'walmart' | 'ebay' | 'other';
  storeName?: string; // Store name for non-partner sites
  description?: string;
  features?: string[];
  availability: 'in_stock' | 'out_of_stock' | 'limited';

  // Approval and editing flow
  requiresApproval: boolean; // True for non-partner products
  isEditable: boolean; // True if user can edit product details
  extractionStatus: 'complete' | 'partial' | 'minimal' | 'failed';
  missingFields: string[]; // Fields that couldn't be extracted
  extractionDetails: {
    titleConfidence: number;
    priceConfidence: number;
    imageConfidence: number;
  };
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
