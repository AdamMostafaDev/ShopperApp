'use client';

import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, FunnelIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { StarIcon } from '@heroicons/react/24/outline';
import { Product } from '@/types';
import { useCart } from '@/lib/cart-context';
import { myusCategories, MyUSCategory, MyUSSubcategory, buildSearchQuery } from '@/data/myus-categories';
import { captureProductFromUrl } from '@/lib/product-capture';
import { ERROR_MESSAGES } from '@/lib/error-messages';
import Image from 'next/image';

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

// Popular search suggestions
const popularSearches = [
  'AirPods Pro', 'iPhone 15', 'MacBook Air', 'Samsung Galaxy', 'Sony Headphones',
  'Nintendo Switch', 'iPad', 'Apple Watch', 'Kindle', 'Echo Dot'
];

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [capturedProducts, setCapturedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStore] = useState<string>('Amazon'); // Default to Amazon
  const [showFilters, setShowFilters] = useState(true); // Always show filters
  const [sortBy, setSortBy] = useState('featured');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const { addToCart } = useCart();

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
          setCapturedProducts(prev => [result.product!, ...prev]);
          setSearchResults([]); // Clear search results when capturing
        } else {
          setCaptureError(result.error || ERROR_MESSAGES.PRODUCT_CAPTURE_FAILED);
          setSearchResults([]);
          setCapturedProducts([]);
        }
      } catch (error) {
        setCaptureError('An unexpected error occurred while capturing the product');
        setSearchResults([]);
        setCapturedProducts([]);
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
          setCapturedProducts([]); // Clear captured products when searching
          console.log(`Found ${data.products?.length || 0} products for "${query}"`);
        } else {
          console.error('Search failed:', data.error);
          setSearchResults([]);
          setCapturedProducts([]);
          
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
        setCaptureError('An unexpected error occurred during search');
      }
    }
    
    setIsLoading(false);
  };

  // Trigger search when filters change (if there's an active search and not a URL)
  useEffect(() => {
    if (searchQuery.trim() && !isUrl(searchQuery)) {
      const timeoutId = setTimeout(() => {
        handleSearchOrCapture(searchQuery);
      }, 500); // Debounce filter changes
      
      return () => clearTimeout(timeoutId);
    }
  }, [filters, searchQuery]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSearchOrCapture(searchQuery);
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
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 border border-gray-200">
      <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
        <img 
          src={product.image} 
          alt={product.title}
          className="w-full h-full object-contain"
          onError={(e) => {
            e.currentTarget.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="%23f3f4f6"/><text x="150" y="150" text-anchor="middle" dy=".3em" fill="%236b7280" font-family="Arial" font-size="16">Product Image</text></svg>`;
          }}
        />
      </div>
      
      <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 text-sm">
        {product.title}
      </h3>
      
      {product.rating > 0 && (
        <div className="flex items-center mb-2">
          <div className="flex items-center">
            {renderStars(product.rating)}
          </div>
          <span className="text-xs text-gray-500 ml-2">
            ({product.reviewCount?.toLocaleString()})
          </span>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-lg font-bold text-gray-900">
            ${product.price.toFixed(2)}
          </span>
        </div>
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full uppercase font-medium">
          {product.store}
        </span>
      </div>

      <button 
        onClick={() => addToCart(product)}
        className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
      >
        Add to Cart
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-4">
            <div className="flex gap-4 items-center max-w-3xl mx-auto">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Amazon products or paste a product link..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !searchQuery.trim()}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isLoading ? (isUrl(searchQuery) ? 'Capturing...' : 'Searching...') : 'Search'}
              </button>
            </div>
          </form>

          {/* Info Bar */}
          {(searchResults.length > 0 || capturedProducts.length > 0 || isLoading) && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-5 relative">
                  <Image
                    src="/Amazon_logo_wiki.png"
                    alt="Amazon"
                    fill
                    className="object-contain"
                  />
                </div>
                <span className="text-sm text-gray-600">
                  {isLoading ? 'Searching Amazon...' : 'Amazon Results'}
                </span>
              </div>
              {searchResults.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center space-x-2 px-3 py-2 border rounded-lg transition-colors text-sm ${
                    showFilters 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-300 hover:bg-gray-50'
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
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 text-sm">{captureError}</p>
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
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-24">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>

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
            {(searchResults.length > 0 || capturedProducts.length > 0) && (
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm text-gray-600 mt-1">
                    {capturedProducts.length > 0 ? 
                      `${capturedProducts.length} product${capturedProducts.length > 1 ? 's' : ''} captured` :
                      `${searchResults.length} results found`
                    }
                  </p>
                </div>
                
                {searchResults.length > 0 && (
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">Sort by:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <div className="flex flex-col justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600 text-sm">
                  {isUrl(searchQuery) ? 'Analyzing product page and extracting details...' : 'Searching Amazon products...'}
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  {isUrl(searchQuery) ? 'This may take 10-30 seconds depending on the website' : 'Please wait...'}
                </p>
              </div>
            ) : (
              /* Results Grid */
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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

            {/* No Results or Popular Searches */}
            {!isLoading && searchResults.length === 0 && capturedProducts.length === 0 && (
              <div className="text-center py-12">
                {searchQuery ? (
                  <>
                    <p className="text-gray-500 text-lg">
                      {isUrl(searchQuery) ? ERROR_MESSAGES.PRODUCT_CAPTURE_FAILED : `No products found for "${searchQuery}"`}
                    </p>
                    <p className="text-gray-400 text-sm mt-2">
                      {isUrl(searchQuery) ? 'Please verify the link is correct or contact our support team for assistance.' : 'Try adjusting your search terms'}
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Popular Searches</h3>
                    <div className="flex flex-wrap justify-center gap-2">
                      {popularSearches.map((search) => (
                        <button
                          key={search}
                          onClick={() => {
                            setSearchQuery(search);
                            handleSearchOrCapture(search);
                          }}
                          className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors text-sm"
                        >
                          {search}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
