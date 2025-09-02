'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { formatBdtPrice } from '@/lib/currency';
import { useCart } from '@/lib/cart-context';

interface Order {
  id: string;
  items: any[];
  subtotal: number;
  shippingCost: number;
  serviceCharge: number;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  customerEmail: string;
  createdAt: string;
  refundDeadline: string;
}

export default function OrderPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { clearCart } = useCart();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const isSuccess = searchParams.get('success') === 'true';

  useEffect(() => {
    if (isSuccess) {
      // Clear cart on successful payment
      clearCart();
    }
  }, [isSuccess, clearCart]);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!session?.user || !id) return;
      
      try {
        const response = await fetch(`/api/orders/${id}`);
        const data = await response.json();
        
        if (data.success) {
          setOrder(data.order);
        } else {
          setError(data.error || 'Failed to load order');
        }
      } catch (err) {
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [session, id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading order details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h1>
            <p className="text-gray-600 mb-6">{error || 'Unable to find the requested order.'}</p>
            <Link 
              href="/orders"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              View All Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Banner */}
        {isSuccess && order.paymentStatus === 'PAID' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <h2 className="text-lg font-semibold text-green-900">Payment Successful!</h2>
                <p className="text-green-700">Your order has been placed and payment processed successfully.</p>
              </div>
            </div>
          </div>
        )}

        {/* Order Details */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Order #{order.id.slice(-8).toUpperCase()}</h1>
                <p className="text-gray-600 mt-1">
                  Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="text-right">
                <div className="flex space-x-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    order.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'SHIPPED' ? 'bg-purple-100 text-purple-800' :
                    order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {order.status}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' :
                    order.paymentStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    Payment {order.paymentStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
            <div className="space-y-4">
              {order.items.map((item: any, index: number) => (
                <div key={index} className="flex items-center space-x-4 py-4 border-b border-gray-100 last:border-b-0">
                  <div className="flex-shrink-0">
                    <img
                      src={item.product.image}
                      alt={item.product.title}
                      className="w-16 h-16 object-cover rounded-lg"
                      onError={(e) => {
                        e.currentTarget.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="%23f3f4f6"/><text x="32" y="32" text-anchor="middle" dy=".3em" fill="%236b7280" font-family="Arial" font-size="10">Image</text></svg>`;
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-medium text-gray-900 truncate">{item.product.title}</h4>
                    <p className="text-sm text-gray-500">{item.product.store}</p>
                    <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-medium text-gray-900">
                      {formatBdtPrice(item.product.price * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="p-6 bg-gray-50 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatBdtPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium">{formatBdtPrice(order.shippingCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Service Charge</span>
                <span className="font-medium">{formatBdtPrice(order.serviceCharge)}</span>
              </div>
              <div className="border-t border-gray-300 pt-2">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-lg font-bold">{formatBdtPrice(order.totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex space-x-4">
          <Link 
            href="/orders"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            View All Orders
          </Link>
          <Link 
            href="/shopping"
            className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}