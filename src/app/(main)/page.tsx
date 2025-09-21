'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShoppingBagIcon,
  GlobeAmericasIcon,
  TruckIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  BoltIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { StarIcon } from '@heroicons/react/24/outline';
import { Product } from '@/types';
import { useCart } from '@/lib/cart-context';
import { captureProductFromUrl, isAmazonLink } from '@/lib/product-capture';
import { ERROR_MESSAGES } from '@/lib/error-messages';
import { formatBdtPrice } from '@/lib/currency';
import Image from 'next/image';

// Mock data for live activity
const recentOrders = [
  { name: 'Ahmed', country: '🇧🇩 Bangladesh', product: 'iPhone 15 Pro', time: '2 min ago' },
  { name: 'Priya', country: '🇮🇳 India', product: 'MacBook Air M3', time: '5 min ago' },
  { name: 'Fatima', country: '🇵🇰 Pakistan', product: 'Samsung Galaxy S24', time: '8 min ago' },
  { name: 'Ravi', country: '🇱🇰 Sri Lanka', product: 'Sony WH-1000XM5', time: '12 min ago' },
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [capturedProducts, setCapturedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showUnsupportedMessage, setShowUnsupportedMessage] = useState(false);
  const [currentOrderIndex, setCurrentOrderIndex] = useState(0);
  const { addToCart } = useCart();

  // Rotate through recent orders
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentOrderIndex((prev) => (prev + 1) % recentOrders.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

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
    <div className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 p-4 border border-gray-100 group hover:-translate-y-1">
      <div className="aspect-square bg-gray-50 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
        <img
          src={product.image}
          alt={product.title}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
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
        <span className="text-xs bg-gradient-to-r from-blue-500 to-blue-600 text-white px-2 py-1 rounded-full uppercase font-medium">
          {product.store}
        </span>
      </div>

      <button
        onClick={() => addToCart(product)}
        className="w-full py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all text-sm font-semibold transform hover:scale-105 shadow-md"
      >
        Add to Cart
      </button>
    </div>
  );

  return (
    <div className="bg-gray-50">
      {/* Enhanced Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white overflow-hidden">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='m0 40l40-40h-40v40zm40 0v-40h-40l40 40z'/%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        {/* Floating elements for depth */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 right-10 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <span className="bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-semibold animate-pulse">
                🔥 Trusted by 250,000+ customers worldwide
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Shop The World,
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400">
                Delivered To Your Door
              </span>
            </h1>
            <p className="text-xl md:text-2xl mb-12 text-blue-100 max-w-3xl mx-auto leading-relaxed">
              Access millions of Amazon products with guaranteed best prices.
              We handle everything from purchase to international delivery.
            </p>

            {/* Prominent Search Bar */}
            <div className="max-w-4xl mx-auto mb-8">
              <form onSubmit={handleSearch}>
                <div className="bg-white/95 backdrop-blur rounded-2xl p-2 shadow-2xl">
                  <div className="flex gap-2 items-center">
                    <div className="flex-1 relative">
                      <MagnifyingGlassIcon className="h-6 w-6 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search Amazon products or paste an Amazon product link..."
                        className="w-full pl-12 pr-4 py-5 text-lg border-0 focus:ring-0 focus:outline-none text-gray-900 placeholder-gray-500 bg-transparent rounded-xl"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading || !searchQuery.trim()}
                      className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-5 rounded-xl hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg transition-all shadow-lg transform hover:scale-105"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          {isUrl(searchQuery) ? 'Finding...' : 'Searching...'}
                        </span>
                      ) : (
                        'Find Product'
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Trust indicators */}
            <div className="flex justify-center items-center gap-8 mb-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-300">250K+</div>
                <div className="text-sm text-blue-200">Orders Delivered</div>
              </div>
              <div className="w-px h-12 bg-blue-400 opacity-40"></div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-300">180+</div>
                <div className="text-sm text-blue-200">Countries</div>
              </div>
              <div className="w-px h-12 bg-blue-400 opacity-40"></div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-300">4.8★</div>
                <div className="text-sm text-blue-200">Customer Rating</div>
              </div>
            </div>

            <p className="text-blue-200 text-sm">
              ✨ Free shipping calculator • 🚚 Express delivery available • 🛡️ 100% insured
            </p>
          </div>
        </div>
      </section>

      {/* Trust & Social Proof Section */}
      <section className="py-12 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          {/* Security badges */}
          <div className="flex flex-wrap justify-center items-center gap-8">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <ShieldCheckIcon className="h-6 w-6 text-green-500" />
              <span className="font-medium">Secure Payment</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <TruckIcon className="h-6 w-6 text-blue-500" />
              <span className="font-medium">Insured Shipping</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <StarIconSolid className="h-6 w-6 text-yellow-500" />
              <span className="font-medium">Money Back Guarantee</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <ClockIcon className="h-6 w-6 text-purple-500" />
              <span className="font-medium">24/7 Support</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircleIcon className="h-6 w-6 text-indigo-500" />
              <span className="font-medium">Verified Sellers</span>
            </div>
          </div>
        </div>
      </section>

      {/* Search Results Section */}
      {(searchResults.length > 0 || capturedProducts.length > 0 || isLoading || searchError || showUnsupportedMessage) && (
        <section className="py-12 bg-gray-50 border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Error Messages */}
            {searchError && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
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
              <div className="mb-6 p-6 bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl text-center">
                <div className="flex items-center justify-center mb-4">
                  <svg className="h-8 w-8 text-yellow-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-yellow-800 mb-2">Link Not Supported Yet</h3>
                <p className="text-yellow-700 mb-4">
                  This link is not supported. We currently only support Amazon product links.
                </p>
                <p className="text-yellow-600 text-sm mb-4">
                  More stores coming soon! Contact support for special requests.
                </p>
                <Link
                  href="/contact"
                  className="inline-block bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-2 rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all font-semibold shadow-md"
                >
                  Contact Support
                </Link>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="flex flex-col justify-center items-center py-12">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-orange-500"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-8 w-8 bg-white rounded-full"></div>
                  </div>
                </div>
                <p className="text-gray-700 text-lg font-medium mt-6">
                  {isUrl(searchQuery) ? 'Analyzing Amazon product page...' : 'Searching Amazon catalog...'}
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  {isUrl(searchQuery) ? 'Extracting product details and best prices' : 'Finding the best deals for you'}
                </p>
              </div>
            )}

            {/* Results Header */}
            {!isLoading && (searchResults.length > 0 || capturedProducts.length > 0) && (
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {capturedProducts.length > 0 ? 'Product Captured' : 'Search Results'}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      {capturedProducts.length > 0 ?
                        `${capturedProducts.length} product${capturedProducts.length > 1 ? 's' : ''} ready to add to cart` :
                        `Found ${searchResults.length} products matching your search`
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                      Best Prices Guaranteed
                    </span>
                  </div>
                </div>
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

      {/* Live Activity Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 rounded-3xl p-8 text-white shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  Live Order Activity
                </h3>
                <div className="space-y-3">
                  {recentOrders.map((order, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-3 bg-white/10 backdrop-blur rounded-lg p-3 transition-all duration-500 ${
                        index === currentOrderIndex ? 'scale-105 bg-white/20' : 'opacity-70'
                      }`}
                    >
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="flex-1">
                        <strong>{order.name}</strong> from {order.country} ordered {order.product}
                      </span>
                      <span className="text-blue-200 text-sm">{order.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-center lg:text-right space-y-4">
                <div>
                  <div className="text-5xl font-bold text-yellow-300">$2.4M+</div>
                  <div className="text-blue-200">Orders processed this month</div>
                </div>
                <div className="flex justify-center lg:justify-end gap-6 text-sm">
                  <div>
                    <div className="text-2xl font-bold text-orange-300">98%</div>
                    <div className="text-blue-200">On-time delivery</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-300">24/7</div>
                    <div className="text-blue-200">Customer support</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Why 250,000+ Customers Choose UniShopper
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We make international shopping simple, secure, and affordable with industry-leading features
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all group hover:-translate-y-2">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <SparklesIcon className="h-8 w-8 text-white" />
              </div>
              <div className="mb-4">
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                  99% Success Rate
                </span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Smart Product Discovery</h3>
              <p className="text-gray-600 leading-relaxed">
                AI-powered search finds the best deals across millions of Amazon products instantly
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all group hover:-translate-y-2">
              <div className="bg-gradient-to-br from-green-500 to-green-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <GlobeAmericasIcon className="h-8 w-8 text-white" />
              </div>
              <div className="mb-4">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                  180+ Countries
                </span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Global Express Shipping</h3>
              <p className="text-gray-600 leading-relaxed">
                Fast, reliable delivery worldwide with real-time tracking and full insurance coverage
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all group hover:-translate-y-2">
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <CurrencyDollarIcon className="h-8 w-8 text-white" />
              </div>
              <div className="mb-4">
                <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-semibold">
                  Save 15-30%
                </span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Best Price Guarantee</h3>
              <p className="text-gray-600 leading-relaxed">
                Dynamic pricing engine ensures you always get the lowest available prices
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all group hover:-translate-y-2">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheckIcon className="h-8 w-8 text-white" />
              </div>
              <div className="mb-4">
                <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">
                  100% Protected
                </span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Buyer Protection</h3>
              <p className="text-gray-600 leading-relaxed">
                Full refund guarantee with comprehensive insurance on every single order
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section - Redesigned */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              3 Simple Steps to Global Shopping
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From search to delivery in the easiest way possible
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                number: '1',
                icon: MagnifyingGlassIcon,
                title: 'Find & Add to Cart',
                description: 'Search or paste Amazon links. Our AI finds the best deals instantly.',
                color: 'from-blue-500 to-blue-600'
              },
              {
                number: '2',
                icon: BoltIcon,
                title: 'We Handle Everything',
                description: 'Purchase, quality check, and international shipping preparation.',
                color: 'from-orange-500 to-orange-600'
              },
              {
                number: '3',
                icon: TruckIcon,
                title: 'Express Delivery',
                description: 'Fast, insured delivery to your door with real-time tracking.',
                color: 'from-green-500 to-green-600'
              }
            ].map((step, index) => (
              <div key={index} className="relative">
                {index < 2 && (
                  <div className="hidden md:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-gray-300 to-gray-400 -translate-x-1/2 z-0"></div>
                )}
                <div className="relative text-center z-10">
                  <div className={`bg-gradient-to-br ${step.color} w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl`}>
                    <step.icon className="h-12 w-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-gray-900">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed max-w-xs mx-auto">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section className="py-20 bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-12 shadow-2xl">
            <div className="flex justify-center mb-6">
              <span className="bg-yellow-400 text-orange-900 px-6 py-2 rounded-full text-sm font-bold animate-bounce">
                LIMITED TIME: Free Shipping on First Order!
              </span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Start Shopping Globally Today
            </h2>
            <p className="text-xl mb-10 text-orange-100 max-w-2xl mx-auto">
              Join 250,000+ happy customers saving money on international shopping
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
              <button
                onClick={() => {
                  const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                  input?.focus();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="bg-white text-orange-600 px-8 py-4 rounded-xl text-lg font-bold hover:bg-gray-100 transition-all shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
              >
                Start Shopping Now <ArrowRightIcon className="h-5 w-5" />
              </button>
              <button className="border-2 border-white text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white hover:text-orange-600 transition-all transform hover:scale-105">
                Calculate Shipping Cost
              </button>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-orange-200 text-sm">
              <span className="flex items-center gap-1">
                <CheckCircleIcon className="h-5 w-5" /> No hidden fees
              </span>
              <span className="flex items-center gap-1">
                <CheckCircleIcon className="h-5 w-5" /> Instant quotes
              </span>
              <span className="flex items-center gap-1">
                <CheckCircleIcon className="h-5 w-5" /> Cancel anytime
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}