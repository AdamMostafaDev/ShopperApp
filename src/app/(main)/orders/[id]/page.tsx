'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { CheckCircleIcon, XCircleIcon, CubeIcon, CheckIcon, TruckIcon, HomeIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { formatBdtPrice } from '@/lib/currency';
import { displayShipping, displayAmount, getDisplayAmounts, getUpdatedItemPrices } from '@/lib/display-utils';
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
  customerPhone?: string;
  shippingAddress: any;
  stripePaymentIntentId?: string;
  currency?: string;
  createdAt: string;
  refundDeadline: string;
  orderPlacedStatus: 'PENDING' | 'PROCESSING' | 'COMPLETE';
  shippedToUsStatus: 'PENDING' | 'PROCESSING' | 'COMPLETE';
  shippedToBdStatus: 'PENDING' | 'PROCESSING' | 'COMPLETE';
  domesticFulfillmentStatus: 'PENDING' | 'PROCESSING' | 'PICKUP' | 'DELIVERY';
  deliveredStatus: 'PENDING' | 'PROCESSING' | 'PICKUP_COMPLETE' | 'DELIVERY_COMPLETE';

  // Pricing fields for display utils
  productCostBdt: number;
  serviceChargeBdt: number;
  shippingCostBdt: number;
  taxBdt: number;
  totalAmountBdt: number;
  exchangeRate: number;
  finalPricingUpdated?: boolean;
  finalProductCostBdt?: number;
  finalServiceChargeBdt?: number;
  finalShippingCostBdt?: number;
  finalShippingOnlyBdt?: number;
  finalAdditionalFeesBdt?: number;
  feeDescription?: string;
  finalTaxBdt?: number;
  finalTotalAmountBdt?: number;
  finalItems?: any[];
}

export default function OrderPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { clearCart } = useCart();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shippingExpanded, setShippingExpanded] = useState(false);

  const isSuccess = searchParams.get('success') === 'true';

  // Helper function to format delivery status for display
  const formatDeliveryStatus = (status: string) => {
    switch (status) {
      case 'PICKUP_COMPLETE': return 'Pickup Complete';
      case 'DELIVERY_COMPLETE': return 'Delivery Complete';
      case 'PROCESSING': return 'Processing';
      case 'PENDING': return 'Pending';
      default: return status;
    }
  };

  // Removed cart clearing from order confirmation page
  // Cart will be cleared only from the checkout form after successful payment

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
              href="/account"
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
        {isSuccess && order.orderPlacedStatus === 'COMPLETE' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <h2 className="text-lg font-semibold text-green-900">Order Placed Successfully!</h2>
                <p className="text-green-700">Your order has been placed successfully. Payment confirmation will be processed within 24 hours.</p>
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
                    {order.orderPlacedStatus === 'COMPLETE' ? (
                      <CheckCircleIcon className="h-6 w-6 text-green-500" />
                    ) : (
                      <div className="h-6 w-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-gray-300"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900">Order Placed</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.orderPlacedStatus === 'COMPLETE' 
                          ? 'bg-green-100 text-green-800'
                          : order.orderPlacedStatus === 'PROCESSING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {order.orderPlacedStatus === 'COMPLETE' ? 'Complete' 
                         : order.orderPlacedStatus === 'PROCESSING' ? 'Processing'
                         : 'Pending'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {order.orderPlacedStatus === 'COMPLETE' 
                        ? new Date(order.createdAt).toLocaleDateString('en-US', { 
                            month: 'long', 
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Processing order placement'
                      }
                    </p>
                  </div>
                </div>

                {/* Payment Confirmation */}
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
                      <h3 className="text-sm font-medium text-gray-900">
                        {order.paymentStatus === 'PENDING' ? 'Price Confirmation' : 'Payment Confirmation'}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.paymentStatus === 'PAID'
                          ? 'bg-green-100 text-green-800'
                          : order.paymentStatus === 'PROCESSING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : order.paymentStatus === 'FAILED'
                          ? 'bg-red-100 text-red-800'
                          : order.paymentStatus === 'REFUNDED'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {order.paymentStatus === 'PAID' ? 'Complete'
                         : order.paymentStatus === 'PROCESSING' ? 'Processing'
                         : order.paymentStatus === 'FAILED' ? 'Failed'
                         : order.paymentStatus === 'REFUNDED' ? 'Refunded'
                         : 'Pending'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {order.paymentStatus === 'PAID'
                        ? `Payment completed on ${new Date(order.createdAt).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}`
                        : order.paymentStatus === 'PROCESSING'
                        ? 'Processing payment - within 24 hours'
                        : order.paymentStatus === 'PENDING'
                        ? 'Awaiting price confirmation'
                        : order.paymentStatus === 'FAILED'
                        ? 'Payment failed - please contact support'
                        : order.paymentStatus === 'REFUNDED'
                        ? `Refunded on ${new Date(order.createdAt).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })}`
                        : 'Status unknown'
                      }
                    </p>
                  </div>
                </div>

                {/* Shipped to US Facility */}
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {order.shippedToUsStatus === 'COMPLETE' ? (
                      <CheckCircleIcon className="h-6 w-6 text-green-500" />
                    ) : (
                      <div className="h-6 w-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-gray-300"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900">Shipped to US Facility</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.shippedToUsStatus === 'COMPLETE'
                          ? 'bg-green-100 text-green-800'
                          : order.shippedToUsStatus === 'PROCESSING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {order.shippedToUsStatus === 'COMPLETE' ? 'Complete'
                         : order.shippedToUsStatus === 'PROCESSING' ? 'Processing'
                         : 'Pending'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {order.shippedToUsStatus === 'COMPLETE'
                        ? new Date(order.createdAt).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })
                        : (() => {
                            const usShipDate = new Date(order.createdAt);
                            usShipDate.setDate(usShipDate.getDate() + 7);
                            return `Expected ${usShipDate.toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            })}`;
                          })()
                      }
                    </p>
                  </div>
                </div>

                {/* Shipped Internationally */}
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {order.shippedToBdStatus === 'COMPLETE' ? (
                      <CheckCircleIcon className="h-6 w-6 text-green-500" />
                    ) : (
                      <div className="h-6 w-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-gray-300"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900">Shipped Internationally</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.shippedToBdStatus === 'COMPLETE'
                          ? 'bg-green-100 text-green-800'
                          : order.shippedToBdStatus === 'PROCESSING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {order.shippedToBdStatus === 'COMPLETE' ? 'Complete'
                         : order.shippedToBdStatus === 'PROCESSING' ? 'Processing'
                         : 'Pending'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {order.shippedToBdStatus === 'COMPLETE'
                        ? new Date(order.createdAt).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })
                        : (() => {
                            const intlShipDate = new Date(order.createdAt);
                            intlShipDate.setDate(intlShipDate.getDate() + 30);
                            return `Expected ${intlShipDate.toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            })}`;
                          })()
                      }
                    </p>
                  </div>
                </div>

                {/* Domestic Shipping */}
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {(order.domesticFulfillmentStatus === 'PICKUP' || order.domesticFulfillmentStatus === 'DELIVERY') ? (
                      <CheckCircleIcon className="h-6 w-6 text-green-500" />
                    ) : (
                      <div className="h-6 w-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-gray-300"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900">Shipped Domestically</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        (order.domesticFulfillmentStatus === 'PICKUP' || order.domesticFulfillmentStatus === 'DELIVERY')
                          ? 'bg-green-100 text-green-800'
                          : order.domesticFulfillmentStatus === 'PROCESSING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {order.domesticFulfillmentStatus === 'PICKUP' ? 'Pickup'
                         : order.domesticFulfillmentStatus === 'DELIVERY' ? 'Delivery'
                         : order.domesticFulfillmentStatus === 'PROCESSING' ? 'Processing'
                         : 'Pending'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {(order.domesticFulfillmentStatus === 'PICKUP' || order.domesticFulfillmentStatus === 'DELIVERY')
                        ? new Date(order.createdAt).toLocaleDateString('en-US', { 
                            month: 'long', 
                            day: 'numeric',
                            year: 'numeric'
                          })
                        : (() => {
                            const deliveryDate = new Date(order.createdAt);
                            deliveryDate.setDate(deliveryDate.getDate() + 31);
                            return `Expected ${deliveryDate.toLocaleDateString('en-US', { 
                              month: 'long', 
                              day: 'numeric',
                              year: 'numeric'
                            })}`;
                          })()
                      }
                    </p>
                  </div>
                </div>

                {/* Delivered */}
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {(order.deliveredStatus === 'PICKUP_COMPLETE' || order.deliveredStatus === 'DELIVERY_COMPLETE') ? (
                      <CheckCircleIcon className="h-6 w-6 text-green-500" />
                    ) : (
                      <div className="h-6 w-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-gray-300"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900">Delivered</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        (order.deliveredStatus === 'PICKUP_COMPLETE' || order.deliveredStatus === 'DELIVERY_COMPLETE')
                          ? 'bg-green-100 text-green-800'
                          : order.deliveredStatus === 'PROCESSING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {formatDeliveryStatus(order.deliveredStatus)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {(order.deliveredStatus === 'PICKUP_COMPLETE' || order.deliveredStatus === 'DELIVERY_COMPLETE')
                        ? new Date(order.createdAt).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })
                        : (() => {
                            const deliveredDate = new Date(order.createdAt);
                            deliveredDate.setDate(deliveredDate.getDate() + 31);
                            return `Expected ${deliveredDate.toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            })}`;
                          })()
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Customer Information</h2>
              <div className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-sm text-gray-900">{order.customerEmail}</p>
                </div>

                {/* Phone */}
                {order.customerPhone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <p className="text-sm text-gray-900">{order.customerPhone}</p>
                  </div>
                )}

                {/* Shipping Address */}
                {order.shippingAddress && Object.keys(order.shippingAddress).length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Address</label>
                    <div className="text-sm text-gray-900">
                      {order.shippingAddress.name && <p>{order.shippingAddress.name}</p>}
                      {order.shippingAddress.line1 && <p>{order.shippingAddress.line1}</p>}
                      {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                      <p>
                        {order.shippingAddress.city && `${order.shippingAddress.city}, `}
                        {order.shippingAddress.state && `${order.shippingAddress.state} `}
                        {order.shippingAddress.postal_code}
                      </p>
                      {order.shippingAddress.country && <p>{order.shippingAddress.country}</p>}
                    </div>
                  </div>
                )}

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-5 bg-blue-600 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">💳</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-900">Credit Card</p>
                      {order.stripePaymentIntentId && (
                        <p className="text-xs text-gray-500">Payment ID: {order.stripePaymentIntentId.slice(-8)}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payment Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount</label>
                  <div className="text-sm text-gray-900">
                    <p className="font-semibold">{formatBdtPrice(order.totalAmount)}</p>
                    {order.currency && order.currency !== 'BDT' && (
                      <p className="text-xs text-gray-500">Currency: {order.currency}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Side - Order Items & Summary */}
          <div className="space-y-6">
            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Order Items ({order.items.length} items)
              </h2>
              
              <div className="space-y-4">
                {(() => {
                  const updatedItems = getUpdatedItemPrices(order);
                  const amounts = getDisplayAmounts(order);

                  return updatedItems.map((item: any, index: number) => (
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
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {displayAmount(item.price * item.quantity, 'BDT')}
                        </div>
                        {item.priceUpdated && (
                          <div className="text-xs text-green-600 font-medium">
                            Updated
                          </div>
                        )}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Order Summary
              </h2>
              
              {/* Totals */}
              <div className="space-y-2">
                {(() => {
                  const amounts = getDisplayAmounts(order);
                  return (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Product Cost</span>
                        <span className="font-medium">{displayAmount(amounts.productCostBdt, 'BDT')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Service Charge</span>
                        <span className="font-medium">{displayAmount(amounts.serviceChargeBdt, 'BDT')}</span>
                      </div>
                      {/* Shipping & Fees display - Collapsible */}
                      {(() => {
                        const hasAdditionalFees = amounts.finalAdditionalFeesBdt && amounts.finalAdditionalFeesBdt > 0;
                        const shippingTotal = amounts.shippingCostBdt;

                        return (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <div
                                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 py-1 rounded flex-1"
                                onClick={() => setShippingExpanded(!shippingExpanded)}
                              >
                                <ChevronDownIcon
                                  className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                                    shippingExpanded ? 'rotate-0' : '-rotate-90'
                                  }`}
                                />
                                <span className="text-gray-600">Shipping & Fees</span>
                              </div>
                              <span className="font-medium">{displayShipping(shippingTotal, 'BDT')}</span>
                            </div>

                            {shippingExpanded && (
                              <div className="ml-6 space-y-2 border-l-2 border-gray-200 pl-4">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">Shipping Cost</span>
                                  <span className="font-medium">{displayShipping(amounts.finalShippingOnlyBdt || amounts.shippingCostBdt || 0, 'BDT')}</span>
                                </div>

                                {hasAdditionalFees && (
                                  <>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-600">Additional Fees</span>
                                      <span className="font-medium">{displayShipping(amounts.finalAdditionalFeesBdt, 'BDT')}</span>
                                    </div>

                                    {amounts.feeDescription && (
                                      <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 text-sm">Fee Description</span>
                                        <span className="text-sm text-gray-700 font-medium">{amounts.feeDescription}</span>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tax</span>
                        <span className="font-medium">{displayAmount(amounts.taxBdt, 'BDT')}</span>
                      </div>
                      <div className="border-t border-gray-200 pt-2">
                        <div className="flex justify-between">
                          <span className="text-base font-semibold">Total</span>
                          <span className="text-base font-bold">{displayAmount(amounts.totalAmountBdt, 'BDT')}</span>
                        </div>
                      </div>
                      {amounts.isUpdated && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-800 font-medium">
                            <CheckCircleIcon className="inline h-4 w-4 mr-2" />
                            You're seeing the most up-to-date product and shipping costs.
                          </p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center space-x-4">
          <Link 
            href="/account"
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