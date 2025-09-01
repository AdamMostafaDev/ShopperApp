'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { UserIcon, CogIcon, ShieldCheckIcon, TruckIcon } from '@heroicons/react/24/outline';

export default function AccountPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    redirect('/signin');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Your Account</h1>
          <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
        </div>

        {/* User Info Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <UserIcon className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{session.user.name}</h2>
              <p className="text-gray-600">{session.user.email}</p>
              <p className="text-sm text-gray-500 mt-1">
                Account created • Member since {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </div>

        {/* Account Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Account Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CogIcon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Account Settings</h3>
            </div>
            <p className="text-gray-600 mb-4">Update your personal information, password, and email preferences.</p>
            <button className="text-blue-600 hover:text-blue-700 font-medium">
              Manage Settings →
            </button>
          </div>

          {/* Security */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <ShieldCheckIcon className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Security</h3>
            </div>
            <p className="text-gray-600 mb-4">Manage your password, two-factor authentication, and login activity.</p>
            <button className="text-blue-600 hover:text-blue-700 font-medium">
              Security Settings →
            </button>
          </div>

          {/* Shipping Addresses */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <TruckIcon className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Shipping Addresses</h3>
            </div>
            <p className="text-gray-600 mb-4">Manage your saved shipping addresses and delivery preferences.</p>
            <button className="text-blue-600 hover:text-blue-700 font-medium">
              Manage Addresses →
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button className="text-left p-4 rounded-lg border border-gray-200 hover:bg-gray-50">
                <div className="font-medium text-gray-900">View Orders</div>
                <div className="text-sm text-gray-500">Track your recent purchases</div>
              </button>
              <button className="text-left p-4 rounded-lg border border-gray-200 hover:bg-gray-50">
                <div className="font-medium text-gray-900">Package Tracking</div>
                <div className="text-sm text-gray-500">Track your shipments</div>
              </button>
              <button className="text-left p-4 rounded-lg border border-gray-200 hover:bg-gray-50">
                <div className="font-medium text-gray-900">Support</div>
                <div className="text-sm text-gray-500">Get help with your account</div>
              </button>
              <button className="text-left p-4 rounded-lg border border-gray-200 hover:bg-gray-50">
                <div className="font-medium text-gray-900">Billing</div>
                <div className="text-sm text-gray-500">View payment methods</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}