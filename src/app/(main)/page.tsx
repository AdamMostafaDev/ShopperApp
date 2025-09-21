'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingBagIcon, GlobeAmericasIcon, TruckIcon, ShieldCheckIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { StarIcon } from '@heroicons/react/24/outline';
import { Product } from '@/types';
import { useCart } from '@/lib/cart-context';
import { captureProductFromUrl, isAmazonLink } from '@/lib/product-capture';
import { ERROR_MESSAGES } from '@/lib/error-messages';
import { formatBdtPrice, formatPriceWithOriginal } from '@/lib/currency';
import Image from 'next/image';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [capturedProducts, setCapturedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showUnsupportedMessage, setShowUnsupportedMessage] = useState(false);
  const { addToCart } = useCart();

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
    setSearchError(null);
    setShowUnsupportedMessage(false);
    
    // Check if input is a URL
    if (isUrl(query)) {
      // Check if it's an Amazon link
      if (!isAmazonLink(query)) {
        setShowUnsupportedMessage(true);
        setSearchResults([]);
        setCapturedProducts([]);
        setIsLoading(false);
        return;
      }
      
      // Handle Amazon link capture
      try {
        const result = await captureProductFromUrl(query);
        
        if (result.success && result.product) {
          setCapturedProducts(prev => [result.product!, ...prev]);
          setSearchResults([]);
        } else {
          setSearchError(result.error || ERROR_MESSAGES.PRODUCT_CAPTURE_FAILED);
          setSearchResults([]);
          setCapturedProducts([]);
        }
      } catch (error) {
        setSearchError('An unexpected error occurred while capturing the product');
        setSearchResults([]);
        setCapturedProducts([]);
      }
    } else {
      // Handle Amazon search
      try {
        const params = new URLSearchParams({
          q: query,
          page: '1',
          store: 'amazon'
        });

        const response = await fetch(`/api/search?${params}`);
        const data = await response.json();
        
        if (data.success) {
          setSearchResults(data.products || []);
          setCapturedProducts([]);
        } else {
          setSearchResults([]);
          setCapturedProducts([]);
          
          if (data.rateLimited) {
            setSearchError('Rate limit exceeded. Please wait a moment before searching again.');
          } else {
            setSearchError(data.error || 'Search failed. Please try again.');
          }
        }
      } catch (error) {
        setSearchResults([]);
        setCapturedProducts([]);
        setSearchError('An unexpected error occurred during search');
      }
    }
    
    setIsLoading(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSearchOrCapture(searchQuery);
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
        <div className="flex flex-col space-y-1">
          <span className="text-lg font-bold text-gray-900">
            {formatBdtPrice(product.price)}
          </span>
          {product.originalPriceValue && product.originalCurrency && (
            <span className="text-xs text-gray-500">
              ${product.originalPriceValue.toFixed(2)} {product.originalCurrency}
            </span>
          )}
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
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Find Any Product
              <span className="block text-blue-200">We'll Get It For You</span>
            </h1>
            <p className="text-xl md:text-2xl mb-12 text-blue-100 max-w-3xl mx-auto">
              Search Amazon products or paste any Amazon product link. 
              We find the best deals and handle everything from purchase to worldwide delivery.
            </p>
            
            {/* Prominent Search Bar */}
            <div className="max-w-4xl mx-auto mb-8">
              <form onSubmit={handleSearch}>
                <div className="bg-white rounded-2xl p-4 shadow-2xl">
                  <div className="flex gap-4 items-center">
                    <div className="flex-1 relative">
                      <MagnifyingGlassIcon className="h-6 w-6 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search Amazon products or paste an Amazon product link..."
                        className="w-full pl-12 pr-4 py-4 text-lg border-0 focus:ring-0 focus:outline-none text-gray-900 placeholder-gray-500 bg-transparent"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading || !searchQuery.trim()}
                      className="bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg transition-colors shadow-lg"
                    >
                      {isLoading ? (isUrl(searchQuery) ? 'Finding...' : 'Searching...') : 'Find Product'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
            
            <p className="text-blue-200 text-sm mb-8">
              Over 1 million products available • Free shipping estimates • Worldwide delivery
            </p>
          </div>
        </div>
      </section>

      {/* Search Results Section */}
      {(searchResults.length > 0 || capturedProducts.length > 0 || isLoading || searchError || showUnsupportedMessage) && (
        <section className="py-12 bg-white border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Error Messages */}
            {searchError && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <p className="text-blue-700 text-sm">{searchError}</p>
                </div>
              </div>
            )}
            
            {/* Unsupported Link Message */}
            {showUnsupportedMessage && (
              <div className="mb-6 p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                <div className="flex items-center justify-center mb-4">
                  <svg className="h-8 w-8 text-yellow-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">Link Not Supported</h3>
                <p className="text-yellow-700 mb-4">
                  This link is not supported as of yet. We currently only support Amazon product links.
                </p>
                <p className="text-yellow-600 text-sm mb-4">
                  Please reach out to contact for assistance with other stores.
                </p>
                <Link 
                  href="/contact" 
                  className="inline-block bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 transition-colors font-medium"
                >
                  Contact Support
                </Link>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="flex flex-col justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600 text-sm">
                  {isUrl(searchQuery) ? 'Analyzing Amazon product page and extracting details...' : 'Searching Amazon products...'}
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  {isUrl(searchQuery) ? 'This may take 10-30 seconds depending on the website' : 'Please wait...'}
                </p>
              </div>
            )}

            {/* Results Header */}
            {!isLoading && (searchResults.length > 0 || capturedProducts.length > 0) && (
              <div className="mb-6">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-8 h-5 relative">
                    <Image
                      src="/Amazon_logo_wiki.png"
                      alt="Amazon"
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
                <p className="text-gray-600">
                  {capturedProducts.length > 0 ? 
                    `${capturedProducts.length} product${capturedProducts.length > 1 ? 's' : ''} captured` :
                    `${searchResults.length} results found`
                  }
                </p>
              </div>
            )}

            {/* Results Grid */}
            {!isLoading && (searchResults.length > 0 || capturedProducts.length > 0) && (
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
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose UniShopper?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We make international shopping simple, secure, and affordable
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBagIcon className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Product Discovery</h3>
              <p className="text-gray-600">
                Search millions of Amazon products or paste any Amazon product link and we'll find the best deals for you
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <GlobeAmericasIcon className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Worldwide Shipping</h3>
              <p className="text-gray-600">
                Ship to 220+ countries and territories with reliable tracking and insurance options
              </p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <TruckIcon className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Best Price Guarantee</h3>
              <p className="text-gray-600">
                We monitor prices and find the best deals, ensuring you get the lowest possible price on your products
              </p>
            </div>

            <div className="text-center">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheckIcon className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Secure & Reliable</h3>
              <p className="text-gray-600">
                Your packages are handled with care and protected with comprehensive insurance coverage
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We handle everything from finding products to worldwide delivery
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-6 text-xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold mb-4">Find Your Product</h3>
              <p className="text-gray-600">
                Search for any Amazon product or paste a product link. We'll help you find exactly what you're looking for.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-6 text-xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold mb-4">We Handle Purchase & Packaging</h3>
              <p className="text-gray-600">
                We find the best deals, handle the checkout process, and carefully package your items for international shipping.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-6 text-xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold mb-4">Delivered to You</h3>
              <p className="text-gray-600">
                Your products are delivered directly to your international address with full tracking and insurance coverage.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Find Your Products?
          </h2>
          <p className="text-xl mb-8 text-blue-100 max-w-2xl mx-auto">
            Join thousands of customers who trust UniShopper to find and deliver products worldwide
          </p>
          <div className="flex justify-center">
            <button 
              onClick={() => {
                const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                input?.focus();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="bg-white text-blue-600 px-12 py-4 rounded-xl text-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg"
            >
              Start Your Search
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}