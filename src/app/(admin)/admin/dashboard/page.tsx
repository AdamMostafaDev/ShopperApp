'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShoppingBagIcon,
  UsersIcon,
  CurrencyDollarIcon,
  TruckIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface DashboardStats {
  overview: {
    totalOrders: number;
    totalCustomers: number;
    totalRevenue: number;
    ordersThisMonth: number;
    monthlyRevenue: number;
  };
  orderStatus: {
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
  workflow: {
    pendingPayment: number;
    pendingShipment: number;
    inTransit: number;
    delivered: number;
  };
  recentActivity: Array<{
    id: number;
    orderNumber: string;
    customerName: string;
    status: string;
    amount: number;
    formattedDate: string;
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/dashboard-stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome to UniShopper Admin Portal</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg border-l-4 border-blue-500">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShoppingBagIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Orders
                  </dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {stats?.overview.totalOrders || 0}
                  </dd>
                  <dd className="text-xs text-gray-500 mt-1">
                    {stats?.overview.ordersThisMonth || 0} this month
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg border-l-4 border-green-500">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Customers
                  </dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {stats?.overview.totalCustomers || 0}
                  </dd>
                  <dd className="text-xs text-gray-500 mt-1">
                    Registered users
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg border-l-4 border-yellow-500">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Revenue
                  </dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    ৳{stats?.overview.totalRevenue.toLocaleString() || 0}
                  </dd>
                  <dd className="text-xs text-gray-500 mt-1">
                    ৳{stats?.overview.monthlyRevenue.toLocaleString() || 0} this month
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg border-l-4 border-purple-500">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TruckIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    In Transit
                  </dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {stats?.workflow.inTransit || 0}
                  </dd>
                  <dd className="text-xs text-gray-500 mt-1">
                    International shipping
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* International Shipping Workflow */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">International Shipping Workflow</h2>
          <p className="text-sm text-gray-500 mt-1">Track orders through the international shipping process</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-400">
              <div className="flex items-center">
                <ClockIcon className="h-6 w-6 text-orange-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-orange-900">Pending Payment</p>
                  <p className="text-2xl font-bold text-orange-700">{stats?.workflow.pendingPayment || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
              <div className="flex items-center">
                <ShoppingBagIcon className="h-6 w-6 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-900">Pending US Shipment</p>
                  <p className="text-2xl font-bold text-blue-700">{stats?.workflow.pendingShipment || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-400">
              <div className="flex items-center">
                <TruckIcon className="h-6 w-6 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-purple-900">Shipped to BD</p>
                  <p className="text-2xl font-bold text-purple-700">{stats?.workflow.inTransit || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
              <div className="flex items-center">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-900">Delivered</p>
                  <p className="text-2xl font-bold text-green-700">{stats?.workflow.delivered || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Status Overview & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Status Breakdown */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Order Status</h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {[
                { label: 'Pending', count: stats?.orderStatus.pending || 0, color: 'text-yellow-600', bg: 'bg-yellow-50' },
                { label: 'Processing', count: stats?.orderStatus.processing || 0, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Shipped', count: stats?.orderStatus.shipped || 0, color: 'text-purple-600', bg: 'bg-purple-50' },
                { label: 'Delivered', count: stats?.orderStatus.delivered || 0, color: 'text-green-600', bg: 'bg-green-50' },
                { label: 'Cancelled', count: stats?.orderStatus.cancelled || 0, color: 'text-red-600', bg: 'bg-red-50' }
              ].map((status) => (
                <div key={status.label} className={`flex items-center justify-between p-3 rounded-md ${status.bg}`}>
                  <span className={`font-medium ${status.color}`}>{status.label}</span>
                  <span className={`text-lg font-bold ${status.color}`}>{status.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {stats?.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Order #{activity.orderNumber}
                    </p>
                    <p className="text-xs text-gray-500">
                      {activity.customerName} • {activity.formattedDate}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      ৳{activity.amount.toLocaleString()}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      activity.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                      activity.status === 'SHIPPED' ? 'bg-purple-100 text-purple-800' :
                      activity.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {activity.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/admin/dashboard/orders"
              className="group bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200 hover:from-blue-100 hover:to-blue-200 transition-all"
            >
              <div className="flex items-center">
                <ShoppingBagIcon className="h-8 w-8 text-blue-600 group-hover:scale-110 transition-transform" />
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-blue-900">Manage Orders</h3>
                  <p className="text-sm text-blue-700 mt-1">View and update order status</p>
                </div>
              </div>
            </Link>

            <Link
              href="/admin/dashboard/customers"
              className="group bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg border border-green-200 hover:from-green-100 hover:to-green-200 transition-all"
            >
              <div className="flex items-center">
                <UsersIcon className="h-8 w-8 text-green-600 group-hover:scale-110 transition-transform" />
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-green-900">Customer Database</h3>
                  <p className="text-sm text-green-700 mt-1">View customer information</p>
                </div>
              </div>
            </Link>

            <Link
              href="/admin/dashboard/payments"
              className="group bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200 hover:from-purple-100 hover:to-purple-200 transition-all"
            >
              <div className="flex items-center">
                <CurrencyDollarIcon className="h-8 w-8 text-purple-600 group-hover:scale-110 transition-transform" />
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-purple-900">Payment Tracking</h3>
                  <p className="text-sm text-purple-700 mt-1">Monitor payment confirmations</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}