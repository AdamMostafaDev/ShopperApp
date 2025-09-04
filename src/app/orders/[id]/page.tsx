'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { CheckCircleIcon, XCircleIcon, CubeIcon, CheckIcon, TruckIcon, HomeIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { formatBdtPrice } from '@/lib/currency';
import { useCart } from '@/lib/cart-context';

interface Order {
  id: number;
  orderNumber: string;
  items: any[];
  subtotal: number;
  shippingCost?: number;
  serviceCharge: number;
  tax?: number;
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {/* Header */}
        <div className="mb-8">
          <p className="text-lg text-gray-700 mb-1">Order #{order.orderNumber}</p>
          <p className="text-gray-600 mb-3">
            Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
          <h1 className="text-3xl text-gray-900">
            Thank you{session?.user?.firstName ? ` ${session.user.firstName}` : ''}!
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side - Order Process & Items */}
          <div className="space-y-6">
            {/* Order Tracking */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Tracking</h2>
              <div className="space-y-6">
                {/* Order Placed */}
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <CheckCircleIcon className="h-6 w-6 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900">Order Placed</h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Complete
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(order.createdAt).toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                {/* Payment Confirmed */}
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {order.paymentStatus === 'PAID' ? (
                      <CheckCircleIcon className="h-6 w-6 text-green-500" />
                    ) : (
                      <div className="h-6 w-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-gray-300"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900">Payment Confirmation</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.paymentStatus === 'PAID' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.paymentStatus === 'PAID' ? 'Complete' : 'Processing'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {order.paymentStatus === 'PAID' 
                        ? new Date(order.createdAt).toLocaleDateString('en-US', { 
                            month: 'long', 
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Processing payment - within 24 hours'
                      }
                    </p>
                  </div>
                </div>

                {/* Preparing for Shipment */}
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="h-6 w-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-gray-300"></div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900">Shipped Internationally</h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Pending
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {(() => {
                        const prepDate = new Date(order.createdAt);
                        prepDate.setDate(prepDate.getDate() + 30);
                        return `${prepDate.toLocaleDateString('en-US', { 
                          month: 'long', 
                          day: 'numeric',
                          year: 'numeric'
                        })}`;
                      })()}
                    </p>
                  </div>
                </div>

                {/* Out for Delivery */}
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="h-6 w-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-gray-300"></div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900">Out for Delivery</h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Pending
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {(() => {
                        const deliveryDate = new Date(order.createdAt);
                        deliveryDate.setDate(deliveryDate.getDate() + 31);
                        return `${deliveryDate.toLocaleDateString('en-US', { 
                          month: 'long', 
                          day: 'numeric',
                          year: 'numeric'
                        })}`;
                      })()}
                    </p>
                  </div>
                </div>

                {/* Delivered */}
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="h-6 w-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-gray-300"></div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900">Delivered</h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Pending
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {(() => {
                        const deliveredDate = new Date(order.createdAt);
                        deliveredDate.setDate(deliveredDate.getDate() + 31);
                        return `${deliveredDate.toLocaleDateString('en-US', { 
                          month: 'long', 
                          day: 'numeric',
                          year: 'numeric'
                        })}`;
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

                 

            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Order Items ({order.items.length} items)
              </h2>
              
              <div className="space-y-4">
                {order.items.map((item: any, index: number) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="relative flex-shrink-0">
                      <img
                        src={item.product.image}
                        alt={item.product.title}
                        className="w-16 h-16 object-cover rounded-lg"
                        onError={(e) => {
                          e.currentTarget.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="%23f3f4f6"/><text x="32" y="32" text-anchor="middle" dy=".3em" fill="%236b7280" font-family="Arial" font-size="10">Image</text></svg>`;
                        }}
                      />
                      <span className="absolute -top-2 -right-2 bg-gray-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {item.product.title}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {item.product.store}
                      </p>
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {formatBdtPrice(item.product.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side - Order Summary */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Order Summary
              </h2>
              
              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatBdtPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Service Charge</span>
                  <span className="font-medium">{formatBdtPrice(order.serviceCharge)}</span>
                </div>
                {order.tax && order.tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-medium">{formatBdtPrice(order.tax)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-2">
                  <div className="flex justify-between">
                    <span className="text-base font-semibold">Total</span>
                    <span className="text-base font-bold">{formatBdtPrice(order.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center space-x-4">
          <Link 
            href="/orders"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            View All Orders
          </Link>
          <Link 
            href="/search"
            className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}