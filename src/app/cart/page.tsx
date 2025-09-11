'use client';

import { useCart } from '@/lib/cart-context';
import { TrashIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { formatBdtPrice } from '@/lib/currency';
import { calculateCartTotals } from '@/lib/shipping';
import { useState } from 'react';

export default function CartPage() {
  const { state, removeFromCart, updateQuantity, clearCart } = useCart();
  const { data: session } = useSession();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { cart } = state;
  
  // Calculate detailed totals including shipping and service charge
  const totals = calculateCartTotals(
    cart.items.map(item => ({
      price: item.product.price,
      quantity: item.quantity,
      weight: item.product.weight
    }))
  );

  const handleCheckout = async () => {
    // Redirect to information page first (new checkout flow)
    window.location.href = '/checkout/information';
  };

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>
            <div className="bg-white rounded-lg shadow-sm p-12">
              <div className="text-gray-500 mb-6">
                <svg className="mx-auto h-24 w-24 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Your cart is empty</h2>
              <p className="text-gray-600 mb-8">Start shopping to add items to your cart</p>
              <Link 
                href="/shopping" 
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-block"
              >
                Start Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
          <button
            onClick={clearCart}
            className="text-red-600 hover:text-red-700 font-medium"
          >
            Clear Cart
          </button>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Single Cart Card */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="divide-y divide-gray-200">
              {cart.items.map((item) => (
                <div key={item.product.id} className="p-6 flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <img
                      src={item.product.image}
                      alt={item.product.title}
                      className="w-20 h-20 object-cover rounded-lg"
                      onError={(e) => {
                        e.currentTarget.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" fill="%23f3f4f6"/><text x="40" y="40" text-anchor="middle" dy=".3em" fill="%236b7280" font-family="Arial" font-size="12">Image</text></svg>`;
                      }}
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {item.product.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {item.product.store.charAt(0).toUpperCase() + item.product.store.slice(1)}
                    </p>
                    <div className="flex items-center mt-2">
                      <span className="text-lg font-bold text-gray-900">
{formatBdtPrice(item.product.price)}
                      </span>
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="p-1 rounded-full hover:bg-gray-100"
                    >
                      <MinusIcon className="h-4 w-4 text-gray-600" />
                    </button>
                    
                    <span className="text-lg font-medium min-w-[2rem] text-center">
                      {item.quantity}
                    </span>
                    
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="p-1 rounded-full hover:bg-gray-100"
                    >
                      <PlusIcon className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>

                  {/* Item Total */}
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
{formatBdtPrice(item.product.price * item.quantity)}
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-red-600 hover:text-red-700 mt-2"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Checkout Section */}
            <div className="border-t border-gray-200 p-6 text-center bg-white">
              <button 
                onClick={handleCheckout}
                disabled={isCheckingOut}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCheckingOut ? 'Processing...' : `Proceed to Checkout - ${formatBdtPrice(totals.subtotal)}`}
              </button>

              <p className="text-xs text-gray-500">
                Final pricing including taxes, shipping, and fees will be calculated during checkout.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
