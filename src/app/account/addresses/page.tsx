'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, PlusIcon, MapPinIcon } from '@heroicons/react/24/outline';

export default function AddressesPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading addresses...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    redirect('/signin');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Navigation */}
        <div className="mb-6">
          <Link 
            href="/orders"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Orders
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Addresses</h1>
          <p className="text-gray-600">Manage your delivery addresses</p>
        </div>

        {/* Addresses Section */}
        <div className="space-y-6">
          {/* Add New Address Button */}
          <div className="bg-white rounded-lg shadow-sm p-6 border-2 border-dashed border-gray-200">
            <div className="text-center">
              <PlusIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Add New Address</h3>
              <p className="text-gray-500 mb-4">Add a delivery address to get started</p>
              <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium">
                Add Address
              </button>
            </div>
          </div>

          {/* Placeholder for when addresses are implemented */}
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <MapPinIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Address Management Coming Soon
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              We're working on a comprehensive address management system. You'll be able to add, edit, and manage multiple delivery addresses here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}