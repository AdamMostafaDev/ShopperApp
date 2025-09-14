'use client';

import { useState } from 'react';
import { LinkIcon, StarIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { Product } from '@/types';
import { useCart } from '@/lib/cart-context';
import { captureProductFromUrl } from '@/lib/product-capture';
import { ERROR_MESSAGES } from '@/lib/error-messages';



export default function ShoppingPage() {
  const [linkUrl, setLinkUrl] = useState('');
  const [capturedProducts, setCapturedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [showSlowMessage, setShowSlowMessage] = useState(false);
  const { addToCart } = useCart();

  const handleLinkCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setCaptureError(null);
    setShowSlowMessage(false);
    
    // Show "taking longer" message after 15 seconds
    const slowTimer = setTimeout(() => {
      setShowSlowMessage(true);
    }, 15000);
    
    try {
      const result = await captureProductFromUrl(linkUrl);
      
      if (result.success && result.product) {
        setCapturedProducts(prev => [result.product!, ...prev]);
        setLinkUrl(''); // Clear the input after successful capture
      } else {
        setCaptureError(result.error || ERROR_MESSAGES.PRODUCT_CAPTURE_FAILED);
      }
    } catch (error) {
      setCaptureError('An unexpected error occurred');
    } finally {
      clearTimeout(slowTimer);
      setIsLoading(false);
      setShowSlowMessage(false);
    }
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
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200">
      <div className="aspect-square bg-gray-100 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
        <img 
          src={product.image} 
          alt={product.title}
          className="w-full h-full object-contain"
          onError={(e) => {
            e.currentTarget.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="%23f3f4f6"/><text x="150" y="150" text-anchor="middle" dy=".3em" fill="%236b7280" font-family="Arial" font-size="16">Product Image</text></svg>`;
          }}
        />
      </div>
      
      <h3 className="font-semibold text-gray-900 mb-3 line-clamp-3 min-h-[4.5rem]">
        {product.title}
      </h3>
      
      {product.rating > 0 && (
        <div className="flex items-center mb-3">
          <div className="flex items-center">
            {renderStars(product.rating)}
          </div>
          <span className="text-sm text-gray-500 ml-2">
            {product.rating.toFixed(1)} ({product.reviewCount.toLocaleString()})
          </span>
        </div>
      )}

      {product.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {product.description}
        </p>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-xl font-bold text-green-600">
            ${product.price.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`text-xs px-2 py-1 rounded-full uppercase font-medium ${
            product.availability === 'in_stock' ? 'bg-green-100 text-green-800' :
            product.availability === 'limited' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {product.availability === 'in_stock' ? 'In Stock' :
             product.availability === 'limited' ? 'Limited' : 'Out of Stock'}
          </span>
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full uppercase font-medium">
            {product.store}
          </span>
        </div>
      </div>

      {product.features && product.features.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Key Features:</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            {product.features.slice(0, 3).map((feature, index) => (
              <li key={index} className="flex items-start">
                <span className="text-blue-500 mr-1">•</span>
                <span className="line-clamp-1">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button 
        onClick={() => addToCart(product)}
        disabled={product.availability === 'out_of_stock'}
        className={`w-full py-3 rounded-lg transition-colors flex items-center justify-center space-x-2 font-medium ${
          product.availability === 'out_of_stock' 
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        <ShoppingCartIcon className="h-4 w-4" />
        <span>{product.availability === 'out_of_stock' ? 'Out of Stock' : 'Add to Cart'}</span>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Link Capture
          </h1>
          <p className="text-gray-600 mb-4">
            Paste a product link from Amazon, Walmart, or eBay to get real product details and add to your cart
          </p>
          
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">How Link Capture Works:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Copy any product URL from Amazon, Walmart, or eBay</li>
              <li>• Paste it in the field below and click &quot;Capture Product&quot;</li>
              <li>• Our system will extract real product details including price, images, and reviews</li>
              <li>• Add the captured product to your cart for international shipping</li>
            </ul>
          </div>
        </div>

        {/* Link Capture Form */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="p-6">
            <form onSubmit={handleLinkCapture} className="flex gap-4">
              <div className="flex-1">
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="Paste Amazon, Walmart, or eBay product link..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !linkUrl}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isLoading ? 'Capturing...' : 'Capture Product'}
              </button>
            </form>
            
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

            {/* Loading State */}
            {isLoading && (
              <div className="mt-4 flex flex-col justify-center items-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600 text-sm">
                  Analyzing product page and extracting details...
                </p>
                {!showSlowMessage ? (
                  <p className="text-gray-500 text-xs mt-1">
                    This may take 10-30 seconds depending on the website
                  </p>
                ) : (
                  <div className="text-center mt-2">
                    <p className="text-blue-600 text-sm">
                      This is taking longer than expected...
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      Some products require extra time to process. Please wait a moment.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Captured Products */}
        {capturedProducts.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Captured Products
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {capturedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {capturedProducts.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <LinkIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products captured yet</h3>
            <p className="text-gray-500">
              Paste a product link above to get started with capturing product details.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
