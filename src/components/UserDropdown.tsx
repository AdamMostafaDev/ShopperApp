'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { ChevronDownIcon, UserIcon, ClipboardDocumentListIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

export default function UserDropdown() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle sign out
  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut({ 
      callbackUrl: '/',
      redirect: true 
    });
  };

  // Show loading state
  if (status === 'loading') {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-6 h-6 rounded-full bg-gray-200 animate-pulse"></div>
        <div className="w-20 h-4 bg-gray-200 animate-pulse rounded"></div>
      </div>
    );
  }

  // Show sign in link if not authenticated
  if (!session) {
    return (
      <Link 
        href="/signin" 
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
      >
        Sign In
      </Link>
    );
  }

  // Use firstName from session data
  const firstName = session.user.firstName || session.user.email?.split('@')[0] || 'User';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* User greeting button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 focus:outline-none group"
      >
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <UserIcon className="w-5 h-5 text-gray-600" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-xs text-gray-500">Hello</span>
            <span className="font-medium text-gray-900">{firstName}</span>
          </div>
        </div>
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div 
          className="absolute right-0 mt-1 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-50"
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="py-1">
            {/* User info section */}
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900">{session.user.name}</p>
              <p className="text-sm text-gray-500">{session.user.email}</p>
            </div>

            {/* Menu items */}
            <div className="py-1">
              <Link 
                href="/account" 
                className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setIsOpen(false)}
              >
                <UserIcon className="w-5 h-5 text-gray-400" />
                <span>Your Account</span>
              </Link>

              <Link 
                href="/orders" 
                className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setIsOpen(false)}
              >
                <ClipboardDocumentListIcon className="w-5 h-5 text-gray-400" />
                <span>Orders</span>
              </Link>
            </div>

            {/* Sign out */}
            <div className="border-t border-gray-100 py-1">
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5 text-gray-400" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}