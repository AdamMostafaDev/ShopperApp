'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  UsersIcon,
  ShoppingBagIcon,
  ChartBarIcon,
  CogIcon
} from '@heroicons/react/24/outline';

interface AdminUser {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
}

export default function AdminHeader() {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    // Get admin user info from session cookie or API
    const getAdminInfo = async () => {
      try {
        const response = await fetch('/api/admin/me');
        if (response.ok) {
          const data = await response.json();
          setAdminUser(data.admin);
        }
      } catch (error) {
        console.error('Failed to fetch admin info:', error);
      }
    };

    getAdminInfo();
  }, []);

  const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: HomeIcon },
    { name: 'Users', href: '/admin/dashboard/users', icon: UsersIcon },
    { name: 'Orders', href: '/admin/dashboard/orders', icon: ShoppingBagIcon },
    { name: 'Analytics', href: '/admin/dashboard/analytics', icon: ChartBarIcon },
    { name: 'Settings', href: '/admin/dashboard/settings', icon: CogIcon },
  ];

  const handleLogout = async () => {
    // TODO: Implement admin logout
    window.location.href = '/admin';
  };

  return (
    <header className="bg-gray-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">U</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold">UniShopper</span>
                <span className="text-xs text-gray-400">Admin Panel</span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center space-x-2 text-gray-300 hover:text-white px-3 py-2 rounded-md transition-colors"
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right side - User menu */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-3">
              <span className="text-gray-300">
                Welcome, {adminUser ? `${adminUser.firstName}` : 'Admin'}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2"
            >
              {isMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-800">
            <nav className="flex flex-col space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center space-x-2 text-gray-300 hover:text-white px-3 py-2 rounded-md transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              <div className="pt-4 border-t border-gray-800">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-gray-300">
                    Welcome, {adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : 'Admin'}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm font-medium transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}