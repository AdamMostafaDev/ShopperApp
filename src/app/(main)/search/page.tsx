'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { MagnifyingGlassIcon, FunnelIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { StarIcon } from '@heroicons/react/24/outline';
import { Product } from '@/types';
import { useCart } from '@/lib/cart-context';
import { myusCategories, MyUSCategory, MyUSSubcategory, buildSearchQuery } from '@/data/myus-categories';
import { captureProductFromUrl } from '@/lib/product-capture';
import { ERROR_MESSAGES } from '@/lib/error-messages';
import { formatBdtPrice } from '@/lib/currency';
import Image from 'next/image';
import ProductPreview from '@/components/ProductPreview';

// Filter interfaces
interface FilterState {
  stores: string[];
  categories: string[];
  subcategories: string[];
  priceRange: { min: number; max: number };
  rating: number;
  brands: string[];
  freeShipping: boolean;
}

interface SortOption {
  value: string;
  label: string;
}

const sortOptions: SortOption[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-low-high', label: 'Price: Low to High' },
  { value: 'price-high-low', label: 'Price: High to Low' },
  { value: 'rating', label: 'Customer Reviews' },
  { value: 'newest', label: 'Newest Arrivals' },
];

const stores = ['Amazon']; // Focus on Amazon only for now

export default function SearchPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [capturedProducts, setCapturedProducts] = useState<Product[]>([]);
  const [productsForReview, setProductsForReview] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStore] = useState<string>('Amazon'); // Default to Amazon
  const [showFilters, setShowFilters] = useState(true); // Always show filters
  const [sortBy, setSortBy] = useState('featured');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [isAutoSearching, setIsAutoSearching] = useState(false);
  const { addToCart } = useCart();
  const searchParams = useSearchParams();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  const [filters, setFilters] = useState<FilterState>({
    stores: [],
    categories: [],
    subcategories: [],
    priceRange: { min: 0, max: 10000 },
    rating: 0,
    brands: [],
    freeShipping: false,
  });

  // Function to detect if input is a URL
  const isUrl = (string: string): boolean => {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  };

  // Handle both search and link capture
  const handleSearchOrCapture = async (query: string) => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setCaptureError(null);
    
    // Check if input is a URL
    if (isUrl(query)) {
      // Handle link capture
      try {
        const result = await captureProductFromUrl(query);
        
        if (result.success && result.product) {
          // Check if product requires approval (non-Amazon products)
          if (result.product.requiresApproval) {
            setProductsForReview(prev => [result.product!, ...prev]);
          } else {
            // Amazon products go directly to captured products
            setCapturedProducts(prev => [result.product!, ...prev]);
          }
          setSearchResults([]);
        } else {
          setCaptureError(result.error || ERROR_MESSAGES.PRODUCT_CAPTURE_FAILED);
          setSearchResults([]);
          setCapturedProducts([]);
          setProductsForReview([]);
        }
      } catch (error) {
        setCaptureError('An unexpected error occurred while capturing the product');
        setSearchResults([]);
        setCapturedProducts([]);
        setProductsForReview([]);
      }
    } else {
      // Handle search
      try {
        // Build search URL with filters
        const params = new URLSearchParams({
          q: query,
          page: '1'
        });

        // Add selected store
        params.append('store', selectedStore.toLowerCase());
        
        if (filters.priceRange.min > 0) {
          params.append('minPrice', filters.priceRange.min.toString());
        }
        
        if (filters.priceRange.max < 10000) {
          params.append('maxPrice', filters.priceRange.max.toString());
        }
        
        if (filters.rating > 0) {
          params.append('rating', filters.rating.toString());
        }
        
        if (filters.categories.length > 0) {
          params.append('category', filters.categories[0]);
        }
        
        if (filters.subcategories.length > 0) {
          params.append('subcategory', filters.subcategories[0]);
        }

        const response = await fetch(`/api/search?${params}`);
        const data = await response.json();
        
        if (data.success) {
          setSearchResults(data.products || []);
          setCapturedProducts([]);
          setProductsForReview([]);
          console.log(`Found ${data.products?.length || 0} products for "${query}"`);
        } else {
          console.error('Search failed:', data.error);
          setSearchResults([]);
          setCapturedProducts([]);
          setProductsForReview([]);
          
          // Show user-friendly error message
          if (data.rateLimited) {
            setCaptureError('Rate limit exceeded. Please wait a moment before searching again.');
          } else {
            setCaptureError(data.error || 'Search failed. Please try again.');
          }
        }
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
        setCapturedProducts([]);
        setProductsForReview([]);
        setCaptureError('An unexpected error occurred during search');
      }
    }
    
    setIsLoading(false);
  };

  // Handle URL parameter search (auto-search when coming from main page)
  useEffect(() => {
    const queryParam = searchParams.get('q');
    if (queryParam && !isAutoSearching) {
      const decodedQuery = decodeURIComponent(queryParam);
      // Create a simplified key using URL hash to handle encoding issues
      const urlHash = btoa(decodedQuery).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
      const processedKey = `processed_${urlHash}`;
      const timestampKey = `${processedKey}_timestamp`;
      // Only process if this URL hasn't been processed recently (within 2 minutes)
      // This prevents rapid duplicates while still allowing fresh data
      const twoMinutesAgo = Date.now() - 120000; // 2 minutes
      const lastProcessedTime = parseInt(localStorage.getItem(timestampKey) || '0');
      const shouldProcess = lastProcessedTime < twoMinutesAgo;
      if (shouldProcess) {
        setIsAutoSearching(true);
        setSearchQuery(decodedQuery);
        localStorage.setItem(processedKey, 'true');
        localStorage.setItem(timestampKey, Date.now().toString());

        handleSearchOrCapture(decodedQuery).finally(() => {
          setIsAutoSearching(false);
        });
      } else {
        // Just set the search query without triggering search
        setSearchQuery(decodedQuery);
        console.log('🚫 Blocked duplicate API call - URL processed within 2 minutes');
      }
    }
  }, [searchParams, isAutoSearching]);

  // Trigger search when filters change (if there's an active search and not a URL)
  useEffect(() => {
    if (searchQuery.trim() && !isUrl(searchQuery) && !isAutoSearching) {
      const timeoutId = setTimeout(() => {
        handleSearchOrCapture(searchQuery);
      }, 500); // Debounce filter changes

      return () => clearTimeout(timeoutId);
    }
  }, [filters, searchQuery, isAutoSearching]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading && !isAutoSearching) {
      await handleSearchOrCapture(searchQuery);
    }
  };

  const handleProductApproval = (approvedProduct: Product) => {
    // Move product from review to captured products
    setProductsForReview(prev => prev.filter(p => p.id !== approvedProduct.id));
    setCapturedProducts(prev => [approvedProduct, ...prev]);
  };

  const handleProductRejection = (productId: string) => {
    // Remove product from review list
    setProductsForReview(prev => prev.filter(p => p.id !== productId));
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleFilterChange = (filterType: keyof FilterState, value: unknown) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <StarIconSolid key={i} className="h-4 w-4 text-yellow-400" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <div key="half" className="relative">
          <StarIcon className="h-4 w-4 text-gray-300" />
          <div className="absolute inset-0 overflow-hidden w-1/2">
            <StarIconSolid className="h-4 w-4 text-yellow-400" />
          </div>
        </div>
      );
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <StarIcon key={`empty-${i}`} className="h-4 w-4 text-gray-300" />
      );
    }

    return stars;
  };

  const ProductCard = ({ product }: { product: Product }) => (
    <div className="bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 p-5 border border-gray-100 group hover:-translate-y-2 cursor-pointer">
      <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl mb-4 flex items-center justify-center overflow-hidden">
        <img
          src={product.image}
          alt={product.title}
          className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
          onError={(e) => {
            e.currentTarget.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="%23f3f4f6"/><text x="150" y="150" text-anchor="middle" dy=".3em" fill="%236b7280" font-family="Arial" font-size="16">Product Image</text></svg>`;
          }}
        />
      </div>

      <h3 className="font-semibold text-gray-900 mb-3 line-clamp-2 text-base min-h-[3rem]">
        {product.title}
      </h3>

      {product.rating && product.rating > 0 && (
        <div className="flex items-center mb-3">
          <div className="flex items-center">
            {renderStars(product.rating)}
          </div>
          <span className="text-xs text-gray-600 ml-2 font-medium">
            ({product.reviewCount?.toLocaleString()})
          </span>
        </div>
      )}

      <div className="mb-4">
        <div className="flex items-baseline space-x-2 mb-1">
          <span className="text-2xl font-bold text-gray-900">
            {formatBdtPrice(product.price)}
          </span>
          <span className="text-xs bg-gradient-to-r from-blue-500 to-blue-600 text-white px-2 py-1 rounded-full uppercase font-medium">
            {product.store}
          </span>
        </div>
        {product.originalPriceValue && product.originalCurrency && (
          <span className="text-xs text-gray-500">
            ${product.originalPriceValue.toFixed(2)} {product.originalCurrency}
          </span>
        )}
      </div>

      <button
        onClick={() => addToCart(product)}
        className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all text-sm font-bold transform hover:scale-105 shadow-lg hover:shadow-xl"
      >
        Add to Cart
      </button>
    </div>
  );

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render page content if not authenticated
  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-b border-gray-200 sticky top-0 z-40 shadow-lg backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-4">
            <div className="flex gap-3 items-center max-w-4xl mx-auto">
              <div className="flex-1 relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-xl opacity-0 group-focus-within:opacity-10 transition-opacity blur-xl"></div>
                <MagnifyingGlassIcon className="h-6 w-6 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors z-10" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products worldwide or paste any product link..."
                  className="w-full pl-14 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base shadow-lg transition-all hover:shadow-xl hover:border-blue-300 bg-white/80 backdrop-blur-sm placeholder:text-gray-400 relative z-10"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !searchQuery.trim()}
                className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all group"
              >
                <span className="relative z-10">{isLoading ? (isUrl(searchQuery) ? 'Capturing...' : 'Searching...') : 'Search'}</span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-400 opacity-0 group-hover:opacity-20 transition-opacity"></div>
              </button>
            </div>
          </form>

          {/* Info Bar */}
          {(searchResults.length > 0 || capturedProducts.length > 0 || isLoading) && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-5 relative">
                  <Image
                    src="/assets/logos/Amazon_logo_wiki.png"
                    alt="Amazon"
                    fill
                    className="object-contain"
                  />
                </div>
                <span className="text-sm text-gray-700 font-medium">
                  {isLoading ? 'Searching Amazon...' : 'Amazon Results'}
                </span>
              </div>
              {searchResults.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                    showFilters
                      ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-2 border-gray-200'
                  }`}
                >
                  <FunnelIcon className="h-4 w-4" />
                  <span>Filters</span>
                </button>
              )}
            </div>
          )}

          {/* Error Display */}
          {captureError && (
            <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 text-sm font-medium">{captureError}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Categories Sidebar - Only visible when there are search results */}
          {showFilters && searchResults.length > 0 && (
              <div className="w-64 flex-shrink-0">
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sticky top-24">
                  <h3 className="text-lg font-bold text-gray-900 mb-6">Filters</h3>

                {/* Categories Navigation */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Categories</h4>
                  <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
                    {myusCategories.map((category) => (
                      <div key={category.id} className="mb-2">
                        <button
                          onClick={() => {
                            if (expandedCategories.includes(category.id)) {
                              setExpandedCategories(prev => prev.filter(id => id !== category.id));
                            } else {
                              setExpandedCategories(prev => [...prev, category.id]);
                            }
                            setSelectedCategory(category.id);
                            setSelectedSubcategory(null);
                            setSearchQuery(buildSearchQuery(category.id));
                            handleSearchOrCapture(buildSearchQuery(category.id));
                          }}
                          className={`flex items-center justify-between w-full text-left text-sm hover:text-gray-900 py-2 px-3 rounded-lg transition-colors ${
                            selectedCategory === category.id 
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span>{category.name}</span>
                          {expandedCategories.includes(category.id) ? (
                            <ChevronUpIcon className="h-4 w-4" />
                          ) : (
                            <ChevronDownIcon className="h-4 w-4" />
                          )}
                        </button>
                        
                        {expandedCategories.includes(category.id) && category.subcategories && (
                          <div className="ml-4 mt-1 space-y-1">
                            {category.subcategories.map((subcategory) => (
                              <button
                                key={subcategory.id}
                                onClick={() => {
                                  setSelectedSubcategory(subcategory.id);
                                  setSearchQuery(buildSearchQuery(category.id, subcategory.id));
                                  handleSearchOrCapture(buildSearchQuery(category.id, subcategory.id));
                                }}
                                className={`w-full text-left text-xs py-2 px-3 rounded-lg transition-colors ${
                                  selectedSubcategory === subcategory.id
                                    ? 'bg-blue-50 text-blue-700 font-medium'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                              >
                                {subcategory.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Price Range</h4>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.priceRange.min || ''}
                      onChange={(e) => handleFilterChange('priceRange', {
                        ...filters.priceRange,
                        min: parseInt(e.target.value) || 0
                      })}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.priceRange.max || ''}
                      onChange={(e) => handleFilterChange('priceRange', {
                        ...filters.priceRange,
                        max: parseInt(e.target.value) || 10000
                      })}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>

                {/* Rating Filter */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Customer Reviews</h4>
                  {[4, 3, 2, 1].map((rating) => (
                    <label key={rating} className="flex items-center mb-2">
                      <input
                        type="radio"
                        name="rating"
                        checked={filters.rating === rating}
                        onChange={() => handleFilterChange('rating', rating)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <div className="ml-2 flex items-center">
                        {Array.from({ length: rating }, (_, i) => (
                          <StarIconSolid key={i} className="h-4 w-4 text-yellow-400" />
                        ))}
                        <span className="ml-1 text-sm text-gray-600">& Up</span>
                      </div>
                    </label>
                  ))}
                </div>
                </div>
              </div>
            )}

                    {/* Results Area */}
          <div className="flex-1">
            {/* Results Header */}
            {(searchResults.length > 0 || capturedProducts.length > 0 || productsForReview.length > 0) && (
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">
                    {productsForReview.length > 0 ? 'Product Review Required' :
                     capturedProducts.length > 0 ? 'Product Captured' : 'Search Results'}
                  </h2>
                  <p className="text-sm text-gray-600 mt-2">
                    {productsForReview.length > 0 ?
                      `${productsForReview.length} product${productsForReview.length > 1 ? 's' : ''} need${productsForReview.length === 1 ? 's' : ''} your review` :
                      capturedProducts.length > 0 ?
                        `${capturedProducts.length} product${capturedProducts.length > 1 ? 's' : ''} ready to add to cart` :
                        `Found ${searchResults.length} products`
                    }
                  </p>
                </div>

                {searchResults.length > 0 && (
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-700">Sort by:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm font-medium"
                    >
                      {sortOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Loading State */}
            {isLoading ? (
              <div className="flex flex-col justify-center items-center py-20">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200"></div>
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent absolute top-0 left-0"></div>
                </div>
                <p className="text-gray-700 text-base font-medium mt-6">
                  {isUrl(searchQuery) ? 'Analyzing product page...' : 'Searching Amazon products...'}
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  {isUrl(searchQuery) ? 'This may take 10-30 seconds depending on the website' : 'Please wait...'}
                </p>
              </div>
            ) : (
              /* Results Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {/* Show products requiring review */}
                {productsForReview.map((product) => (
                  <ProductPreview
                    key={product.id}
                    product={product}
                    onApprove={handleProductApproval}
                    onReject={handleProductRejection}
                  />
                ))}
                {/* Show captured products */}
                {capturedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
                {/* Show search results */}
                {searchResults.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            {/* No Results */}
            {!isLoading && searchResults.length === 0 && capturedProducts.length === 0 && productsForReview.length === 0 && (
              <div className="text-center py-20">
                {searchQuery ? (
                  <div className="max-w-md mx-auto">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                      <MagnifyingGlassIcon className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {isUrl(searchQuery) ? 'Unable to capture product' : 'No products found'}
                    </h3>
                    <p className="text-gray-500">
                      {isUrl(searchQuery)
                        ? 'Please verify the link is correct or contact our support team for assistance.'
                        : `We couldn't find any results for "${searchQuery}". Try different keywords.`}
                    </p>
                  </div>
                ) : (
                  <div className="max-w-md mx-auto">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                      <MagnifyingGlassIcon className="w-10 h-10 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Start Your Search
                    </h3>
                    <p className="text-gray-500">
                      Search for products or paste a product link to get started
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
