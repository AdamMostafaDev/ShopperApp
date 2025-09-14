import { redirect } from 'next/navigation';

export default function AdminDashboard() {
  return (
    <div className="min-h-screen">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <h1 className="text-xl font-semibold text-gray-900">
              UniShopper Admin Dashboard
            </h1>
            <button className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700">
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Orders Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Orders
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      -
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Customers Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Customers
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      -
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Revenue
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      -
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <button className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow text-left">
              <h3 className="font-medium text-gray-900">View Orders</h3>
              <p className="text-sm text-gray-500 mt-1">Manage customer orders</p>
            </button>
            <button className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow text-left">
              <h3 className="font-medium text-gray-900">Customer Info</h3>
              <p className="text-sm text-gray-500 mt-1">View customer details</p>
            </button>
            <button className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow text-left">
              <h3 className="font-medium text-gray-900">Payment Status</h3>
              <p className="text-sm text-gray-500 mt-1">Check payment confirmations</p>
            </button>
            <button className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow text-left">
              <h3 className="font-medium text-gray-900">Email Status</h3>
              <p className="text-sm text-gray-500 mt-1">Check Klaviyo emails</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}