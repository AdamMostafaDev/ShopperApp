'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { 
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  UserIcon,
  MapPinIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { formatBdtPrice } from '@/lib/currency';

interface Order {
  id: string;
  orderNumber: string;
  items: any[];
  productCostBdt: number;
  shippingCostBdt: number;
  serviceChargeBdt: number;
  totalAmountBdt: number;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  country: string | null;
}

export default function OrdersPage() {
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Debug logging
  console.log('🔍 Orders page - Session status:', status);
  console.log('🔍 Orders page - Session data:', session);


  useEffect(() => {
    if (session?.user) {
      fetchOrders();
    }
  }, [session]);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      } else {
        setError('Failed to load orders');
      }
    } catch (err) {
      setError('An error occurred while loading orders');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusColors: { [key: string]: string } = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PROCESSING: 'bg-blue-100 text-blue-800',
      PAID: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
      SHIPPED: 'bg-purple-100 text-purple-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
      REFUNDED: 'bg-orange-100 text-orange-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Sign In</h2>
          <p className="text-gray-600 mb-6">You need to sign in to view your orders.</p>
          <Link 
            href="/signin"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order History</h1>
          <p className="text-gray-600">Track and manage your orders</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Orders Section */}
          <div className="lg:col-span-3">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {orders.length === 0 ? (
              /* Empty State */
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <ClipboardDocumentListIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No orders yet
                </h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  You haven't placed any orders yet. Start shopping to see your order history here.
                </p>
                <Link
                  href="/search"
                  className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  <MagnifyingGlassIcon className="w-5 h-5" />
                  <span>Start Shopping</span>
                </Link>
              </div>
            ) : (
              /* Orders Table */
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Your Orders</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payment Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fulfillment Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link 
                              href={`/orders/${order.id}`}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              #{order.orderNumber}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(order.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(order.paymentStatus)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(order.fulfillmentStatus)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatBdtPrice(order.totalAmountBdt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Account Details Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <UserIcon className="w-5 h-5 mr-2 text-gray-400" />
                Account Details
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">First Name</label>
                  <p className="text-sm text-gray-900">{session.user.firstName || 'N/A'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Last Name</label>
                  <p className="text-sm text-gray-900">{session.user.lastName || 'N/A'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-sm text-gray-900">{session.user.email}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Country</label>
                  <p className="text-sm text-gray-900">Bangladesh</p>
                </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <Link
                    href="/account/addresses"
                    className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    <MapPinIcon className="w-4 h-4" />
                    <span>View Addresses</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}