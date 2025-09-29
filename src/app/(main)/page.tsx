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
import ProductPreview from '@/components/ProductPreview';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AuthModal from '@/components/AuthModal';

// Dynamic live activity data pools
const customerNames = [
  'Ahmed', 'Priya', 'Fatima', 'Ravi', 'Sarah', 'Mohammed', 'Aisha', 'Raj', 'Maria', 'Hassan',
  'Deepika', 'Omar', 'Zara', 'Arjun', 'Noor', 'Ali', 'Ananya', 'Tariq', 'Kavya', 'Imran',
  'Sofia', 'Yusuf', 'Meera', 'Bilal', 'Rina', 'Karim', 'Lila', 'Saeed', 'Diya', 'Rashid'
];

const countries = [
  { name: 'Bangladesh', flag: '🇧🇩' },
  { name: 'India', flag: '🇮🇳' },
  { name: 'Pakistan', flag: '🇵🇰' },
  { name: 'Sri Lanka', flag: '🇱🇰' },
  { name: 'Nepal', flag: '🇳🇵' },
  { name: 'Singapore', flag: '🇸🇬' },
  { name: 'Malaysia', flag: '🇲🇾' },
  { name: 'Thailand', flag: '🇹🇭' },
  { name: 'UAE', flag: '🇦🇪' },
  { name: 'Qatar', flag: '🇶🇦' },
  { name: 'Kuwait', flag: '🇰🇼' },
  { name: 'Saudi Arabia', flag: '🇸🇦' }
];

const popularProducts = [
  'iPhone 15 Pro', 'MacBook Air M3', 'Samsung Galaxy S24', 'Sony WH-1000XM5', 'iPad Pro',
  'AirPods Pro 2', 'Dell XPS 13', 'Canon EOS R6', 'Nintendo Switch OLED', 'PS5',
  'Apple Watch Series 9', 'Surface Pro 9', 'Bose QuietComfort', 'Instant Pot Duo',
  'Dyson V15 Detect', 'KitchenAid Mixer', 'Fitbit Charge 5', 'Echo Dot 5th Gen',
  'Ring Video Doorbell', 'Roku Ultra', 'GoPro Hero 12', 'Kindle Paperwhite',
  'JBL Flip 6', 'Samsung Galaxy Buds', 'Apple Magic Keyboard', 'Logitech MX Master 3'
];

const dynamicPlaceholders = [
  'Buy iPhone 15 Pro at Apple',
  'Get MacBook Air at Best Buy',
  'Shop Nike Air Max at Nike',
  'Find Samsung TV at Target',
  'Buy AirPods Pro at Amazon',
  'Get PlayStation 5 at Walmart',
  'Shop Canon Camera at B&H',
  'Find KitchenAid Mixer at Macy\'s',
  'Buy Tesla Model Y at Tesla',
  'Get iPad Pro at Costco'
];

interface LiveOrder {
  id: string;
  name: string;
  country: string;
  product: string;
  timestamp: number;
  timeOffset: number; // Minutes to add to the timestamp for display
  isNew?: boolean;
}

// Track used combinations to avoid duplicates
let usedCombinations = new Set<string>();

const generateRandomOrder = (): LiveOrder => {
  let randomName, randomCountry, randomProduct, combinationKey;

  // Keep trying until we get a unique combination
  do {
    randomName = customerNames[Math.floor(Math.random() * customerNames.length)];
    randomCountry = countries[Math.floor(Math.random() * countries.length)];
    randomProduct = popularProducts[Math.floor(Math.random() * popularProducts.length)];
    combinationKey = `${randomName}-${randomCountry.name}-${randomProduct}`;
  } while (usedCombinations.has(combinationKey));

  // Add to used combinations
  usedCombinations.add(combinationKey);

  // Clear the set if it gets too large (after 50+ combinations)
  if (usedCombinations.size > 50) {
    usedCombinations.clear();
  }

  const randomOffset = Math.floor(Math.random() * 20); // 0-20 minutes offset

  return {
    id: Math.random().toString(36).substr(2, 9),
    name: randomName,
    country: `${randomCountry.flag} ${randomCountry.name}`,
    product: randomProduct,
    timestamp: Date.now(),
    timeOffset: randomOffset,
    isNew: true
  };
};

const getTimeAgo = (timestamp: number, offset: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000) + (offset * 60);

  if (seconds < 60) return 'just now';
  if (seconds < 120) return '1 min ago';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 7200) return '1 hour ago';
  return `${Math.floor(seconds / 3600)} hours ago`;
};


export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [capturedProducts, setCapturedProducts] = useState<Product[]>([]);
  const [productsForReview, setProductsForReview] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showUnsupportedMessage, setShowUnsupportedMessage] = useState(false);
  const [liveOrders, setLiveOrders] = useState<LiveOrder[]>([]);
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const [typedPlaceholder, setTypedPlaceholder] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { addToCart } = useCart();
  const { data: session, status } = useSession();
  const router = useRouter();

  // State for current highlighted order
  const [currentOrderIndex, setCurrentOrderIndex] = useState(0);

  // Initialize with some orders and generate new ones dynamically
  useEffect(() => {
    // Clear combinations on page load
    usedCombinations.clear();

    // Start with a few initial orders with different timestamps (newest first)
    const now = Date.now();
    const initialOrders = [];

    // Generate orders from newest to oldest
    for (let i = 0; i < 4; i++) {
      const order = generateRandomOrder();
      initialOrders.push({
        ...order,
        timestamp: now - (i * 120000) - (order.timeOffset * 60000), // Each order 2 minutes apart + offset
        isNew: false
      });
    }

    // Sort by effective timestamp descending (newest first)
    initialOrders.sort((a, b) => (b.timestamp - b.timeOffset * 60000) - (a.timestamp - a.timeOffset * 60000));
    setLiveOrders(initialOrders);

    // Generate new orders at random intervals
    const generateNewOrder = () => {
      const newOrder = generateRandomOrder();
      setLiveOrders(prev => {
        const updated = [newOrder, ...prev.slice(0, 3)]; // Keep only 4 most recent
        // Sort by effective timestamp descending (newest first)
        return updated.sort((a, b) => (b.timestamp - b.timeOffset * 60000) - (a.timestamp - a.timeOffset * 60000));
      });
      setCurrentOrderIndex(0); // Highlight the new order
    };

    // Generate new orders every 0-2 minutes (random intervals)
    const scheduleNextOrder = () => {
      const delay = Math.random() * 300000; // 0 to 2 minutes
      setTimeout(() => {
        generateNewOrder();
        scheduleNextOrder();
      }, delay);
    };

    scheduleNextOrder();
  }, []);

  // Rotate highlighting between orders
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentOrderIndex(prev => (prev + 1) % liveOrders.length);
    }, 3000); // Highlight each order for 3 seconds

    return () => clearInterval(interval);
  }, [liveOrders.length]);

  // Update timestamps every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveOrders(prev => [...prev]); // Force re-render to update times
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Typing animation for placeholder text
  useEffect(() => {
    const animateTyping = async () => {
      const targetText = dynamicPlaceholders[currentPlaceholder];

      if (!targetText) return;

      // Type out the text
      for (let i = 0; i <= targetText.length; i++) {
        setTypedPlaceholder(targetText.substring(0, i));
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Wait 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Delete the text
      for (let i = targetText.length; i >= 0; i--) {
        setTypedPlaceholder(targetText.substring(0, i));
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Move to next placeholder
      setCurrentPlaceholder((prev) => (prev + 1) % dynamicPlaceholders.length);
    };

    animateTyping();
  }, [currentPlaceholder]);


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
      // Handle product URL capture (Amazon and non-Amazon)
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
          setSearchError(result.error || ERROR_MESSAGES.PRODUCT_CAPTURE_FAILED);
          setSearchResults([]);
          setCapturedProducts([]);
          setProductsForReview([]);
        }
      } catch (error) {
        setSearchError('An unexpected error occurred while capturing the product');
        setSearchResults([]);
        setCapturedProducts([]);
        setProductsForReview([]);
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

    // Check if user is authenticated
    if (!session) {
      setShowAuthModal(true);
      return;
    }

    // If authenticated, redirect to search page with query
    if (searchQuery.trim()) {
      const encodedQuery = encodeURIComponent(searchQuery.trim());
      router.push(`/search?q=${encodedQuery}`);
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

      {product.rating && product.rating > 0 && (
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
              Shop from Amazon with full integration, plus request products from any store worldwide.
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
                        placeholder={`Paste Product URL to: ${typedPlaceholder}`}
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

      {/* Brand Carousel Section */}
      <section className="py-12 bg-gradient-to-r from-gray-50 to-blue-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Shop Across Thousands of Stores From the US
          </h2>
          <p className="text-gray-600 mb-8 text-lg">
            And ship directly to your home worldwide
          </p>

          {/* Dual-row infinite scrolling carousel */}
          <div className="space-y-8">
            {/* First row - scrolling left */}
            <div className="relative overflow-hidden">
              <div className="flex animate-scroll-left">
                {/* Complete set of logos */}
                <div className="flex shrink-0">
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/apple-logo.png" alt="Apple" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/gap.png" alt="Gap" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/samsung-new.png" alt="Samsung" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/sephora.png" alt="Sephora" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/Amazon_logo_wiki.png" alt="Amazon" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/polo_ralph-lauren_new.png" alt="Ralph Lauren" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/nintendo-2-logo-png-transparent.png" alt="Nintendo" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/macys-logo.png" alt="Macy's" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/sony-2-logo-black-and-white.png" alt="Sony" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/l-oreal-logo.png" alt="L'Oreal" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/Target_New.png" alt="Target" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/CK_Calvin_Klein_logo.png" alt="Calvin Klein" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/ebay-logo.png" alt="eBay" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/Louis-Vuitton-logo.png" alt="Louis Vuitton" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/Best_Buy_Logo.svg.png" alt="Best Buy" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                </div>
                {/* Duplicate set for seamless loop */}
                <div className="flex shrink-0">
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/apple-logo.png" alt="Apple" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/gap.png" alt="Gap" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/samsung-new.png" alt="Samsung" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/sephora.png" alt="Sephora" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/Amazon_logo_wiki.png" alt="Amazon" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/polo_ralph-lauren_new.png" alt="Ralph Lauren" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/nintendo-2-logo-png-transparent.png" alt="Nintendo" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/macys-logo.png" alt="Macy's" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/sony-2-logo-black-and-white.png" alt="Sony" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/l-oreal-logo.png" alt="L'Oreal" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/Target_New.png" alt="Target" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/CK_Calvin_Klein_logo.png" alt="Calvin Klein" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/ebay-logo.png" alt="eBay" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/Louis-Vuitton-logo.png" alt="Louis Vuitton" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/Best_Buy_Logo.svg.png" alt="Best Buy" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                </div>
              </div>
            </div>

            {/* Second row - scrolling right */}
            <div className="relative overflow-hidden">
              <div className="flex animate-scroll-right">
                {/* Complete set of logos */}
                <div className="flex shrink-0">
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/tommy-hilfiger.jpg" alt="Tommy Hilfiger" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/walmart-logo.png" alt="Walmart" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/Ray-Ban_logo.png" alt="Ray-Ban" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/shop-disney-logo.png" alt="Disney" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/The-Fourth-Nike-Logo-Evolution-1971-–-now.png" alt="Nike" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/Microsoft logo.png" alt="Microsoft" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/puma-black-logo-png-701751694774568gw2on2y0un.png" alt="Puma" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/adidas logo.png" alt="Adidas" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/ready-edit-nordstrom-logo-transparent-2.png" alt="Nordstrom" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/Zara_Logo-new.png" alt="Zara" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/carters-logo-120x120.png" alt="Carter's" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/Prada-Symbol.png" alt="Prada" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                </div>
                {/* Duplicate set for seamless loop */}
                <div className="flex shrink-0">
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/tommy-hilfiger.jpg" alt="Tommy Hilfiger" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/walmart-logo.png" alt="Walmart" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/Ray-Ban_logo.png" alt="Ray-Ban" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/shop-disney-logo.png" alt="Disney" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/The-Fourth-Nike-Logo-Evolution-1971-–-now.png" alt="Nike" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/Microsoft logo.png" alt="Microsoft" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/puma-black-logo-png-701751694774568gw2on2y0un.png" alt="Puma" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/adidas logo.png" alt="Adidas" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/ready-edit-nordstrom-logo-transparent-2.png" alt="Nordstrom" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/Zara_Logo-new.png" alt="Zara" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/carters-logo-120x120.png" alt="Carter's" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                  <div className="h-16 w-32 relative flex-shrink-0 mx-4">
                    <Image src="/assets/logos/Prada-Symbol.png" alt="Prada" fill className="object-contain hover:scale-110 transition-all duration-300" loading="lazy" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search Results Section */}
      {(searchResults.length > 0 || capturedProducts.length > 0 || productsForReview.length > 0 || isLoading || searchError || showUnsupportedMessage) && (
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

            {/* Manual Entry Message */}
            {showUnsupportedMessage && (
              <div className="mb-6 p-6 bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-200 rounded-xl text-center">
                <div className="flex items-center justify-center mb-4">
                  <svg className="h-8 w-8 text-orange-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-orange-800 mb-2">Manual Product Entry</h3>
                <p className="text-orange-700 mb-4">
                  We'll manually type up this product for you! Just paste the product URL and we'll handle the rest.
                </p>
                <div className="flex justify-center gap-2 text-sm mb-4">
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">✓ Amazon - Auto</span>
                  <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-medium">📝 Others - Manual Entry</span>
                </div>
                <p className="text-orange-600 text-sm mb-4">
                  Our team will extract product details and add it to your cart within 24 hours.
                </p>
                <Link
                  href="/contact"
                  className="inline-block bg-gradient-to-r from-orange-500 to-yellow-500 text-white px-6 py-2 rounded-lg hover:from-orange-600 hover:to-yellow-600 transition-all font-semibold shadow-md"
                >
                  Submit Product URL
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
            {!isLoading && (searchResults.length > 0 || capturedProducts.length > 0 || productsForReview.length > 0) && (
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {productsForReview.length > 0 ? 'Product Review Required' :
                       capturedProducts.length > 0 ? 'Product Captured' : 'Search Results'}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      {productsForReview.length > 0 ?
                        `${productsForReview.length} product${productsForReview.length > 1 ? 's' : ''} need${productsForReview.length === 1 ? 's' : ''} your review` :
                        capturedProducts.length > 0 ?
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

            {/* Unified Products Grid */}
            {!isLoading && (searchResults.length > 0 || capturedProducts.length > 0 || productsForReview.length > 0) && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
                  {liveOrders.map((order, index) => (
                    <div
                      key={order.id}
                      className={`flex items-center gap-3 bg-white/10 backdrop-blur rounded-lg p-3 transition-all duration-500 ${
                        index === currentOrderIndex ? 'scale-105 bg-white/20' : 'opacity-70'
                      }`}
                    >
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="flex-1">
                        <strong>{order.name}</strong> from {order.country} ordered {order.product}
                      </span>
                      <span className="text-blue-200 text-sm">{getTimeAgo(order.timestamp, order.timeOffset)}</span>
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

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode="signin"
      />
    </div>
  );
}