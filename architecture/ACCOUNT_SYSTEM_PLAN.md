# Account Management Plan
*UniShopper E-commerce Platform - Complete User Account Experience*

## 🚨 MUST READ - CRITICAL REQUIREMENTS

**ALWAYS TEST AFTER EACH FEATURE:**
- Run `npm run build` to check for TypeScript/compile errors
- Test the specific feature you just implemented
- Verify existing functionality still works (no regressions)
- Check database operations work correctly
- Test API endpoints via browser dev tools or Postman

**CRITICAL USER FLOWS:**
1. **Profile Management**: Users must be able to edit name, phone, email with OTP verification
2. **Address Management**: Full CRUD for shipping addresses with default address selection
3. **Security Settings**: Password change with current password validation
4. **Email/Phone Verification**: Both email and SMS OTP verification for account security
5. **Error Handling**: Validation errors should be clear and not break the UI

**VERIFICATION REQUIREMENTS:**
- Email changes require OTP to both old and new email
- Phone changes require SMS OTP to new phone number
- Current password required for sensitive changes
- Rate limiting on verification attempts

**UI/UX STANDARDS:**
- Form validation with real-time feedback
- Loading states for all async operations
- Success/error toast notifications
- Mobile-responsive design
- Accessibility compliance (proper labels, focus states)

---

## 🎯 User Stories & Acceptance Criteria

**As a registered user, I want to:**
- View my account dashboard with order summary and quick actions
- Manage my complete order history with tracking and reorder options
- Edit my profile information (name, email, phone) with proper verification
- Manage my address book for shipping with default selection
- Control my security settings including password and 2FA
- Have a unified, intuitive account management experience

**Acceptance Criteria:**
- All account features accessible from single `/account` navigation
- Order integration seamlessly embedded in account structure
- Email changes require confirmation links (24hr expiration)
- Phone changes require SMS verification
- All changes properly validated and error-handled
- Mobile-responsive design throughout
- Professional UI matching existing site standards

## Overview
Complete unified account management system combining orders, profile, addresses, and security into a cohesive user experience. Replaces separate orders page with integrated account dashboard approach following industry standards (Amazon, Shopify, etc.).

## Current State Analysis
✅ **Already implemented:**
- Basic account page UI (`src/app/account/page.tsx`)
- Placeholder addresses page (`src/app/account/addresses/page.tsx`)
- Order management UI (`src/app/orders/page.tsx`, `src/app/orders/[id]/page.tsx`)
- User and Address models in database
- NextAuth.js session management
- Order creation and storage system

❌ **Missing functionality:**
- Unified account dashboard with order integration
- Profile editing (name, email, phone) with verification
- Address CRUD operations with default selection
- Security settings (password change, 2FA preparation)
- Email confirmation system (Resend integration)
- Phone verification system (SMS OTP)
- Account navigation and layout structure

## Implementation Timeline: 7-9 days total

## 🏗️ Account Structure & Navigation

### New Account Page Hierarchy:
```
/account (Dashboard Overview)
├── /account/orders (Order History & Tracking)  
├── /account/profile (Personal Information)
├── /account/addresses (Shipping Addresses)
└── /account/security (Password & Security)
```

### Unified Navigation:
- **Header**: Home | Search | Cart | Account (Orders removed)
- **Account Sidebar**: Dashboard | Orders | Profile | Addresses | Security
- **Mobile**: Collapsible account menu with all sections

---

# PHASE 1: ACCOUNT LAYOUT & DASHBOARD (2.5 days)

## 1.1 Account Layout Component
**File:** `src/components/account/AccountLayout.tsx`

```typescript
'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { 
  UserIcon, 
  ShoppingBagIcon, 
  MapPinIcon, 
  ShieldCheckIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface AccountLayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  { name: 'Dashboard', href: '/account', icon: UserIcon },
  { name: 'Orders', href: '/account/orders', icon: ShoppingBagIcon },
  { name: 'Profile', href: '/account/profile', icon: UserIcon },
  { name: 'Addresses', href: '/account/addresses', icon: MapPinIcon },
  { name: 'Security', href: '/account/security', icon: ShieldCheckIcon },
];

export default function AccountLayout({ children }: AccountLayoutProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      {/* Mobile sidebar */}
      <div className={`lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex w-64 flex-col bg-white">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Account</h2>
              <button onClick={() => setSidebarOpen(false)}>
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex-1 p-4">
              <ul className="space-y-2">
                {navigationItems.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                        pathname === item.href
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop layout */}
      <div className="lg:flex">
        {/* Desktop sidebar */}
        <div className="hidden lg:block w-64 bg-white border-r border-gray-200 min-h-screen">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Account</h2>
            <p className="text-sm text-gray-600 mt-1">{session.user.email}</p>
          </div>
          <nav className="p-4">
            <ul className="space-y-2">
              {navigationItems.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                      pathname === item.href
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1">
          {/* Mobile header */}
          <div className="lg:hidden bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold">Account</h1>
              <button onClick={() => setSidebarOpen(true)}>
                <Bars3Icon className="h-6 w-6" />
              </button>
            </div>
          </div>
          
          {/* Page content */}
          <main className="p-4 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
```

## 1.2 Account Dashboard Page
**File:** `src/app/account/page.tsx` (replace existing)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import AccountLayout from '@/components/account/AccountLayout';
import { 
  ShoppingBagIcon, 
  TruckIcon, 
  UserIcon, 
  ShieldCheckIcon,
  ArrowRightIcon 
} from '@heroicons/react/24/outline';

interface DashboardStats {
  totalOrders: number;
  recentOrdersCount: number;
  pendingShipments: number;
  profileCompletion: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  itemCount: number;
}

export default function AccountDashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Load dashboard stats and recent orders
        const [statsResponse, ordersResponse] = await Promise.all([
          fetch('/api/account/dashboard/stats'),
          fetch('/api/account/dashboard/recent-orders')
        ]);

        if (statsResponse.ok && ordersResponse.ok) {
          const statsData = await statsResponse.json();
          const ordersData = await ordersResponse.json();
          
          setStats(statsData);
          setRecentOrders(ordersData.orders || []);
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <AccountLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <div className="space-y-6">
        {/* Welcome section */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {session?.user?.firstName || 'User'}!
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your orders, profile, and account settings
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <ShoppingBagIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">{stats?.totalOrders || 0}</p>
                <p className="text-sm text-gray-600">Total Orders</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TruckIcon className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">{stats?.pendingShipments || 0}</p>
                <p className="text-sm text-gray-600">Pending Shipments</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">{stats?.profileCompletion || 0}%</p>
                <p className="text-sm text-gray-600">Profile Complete</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <ShieldCheckIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">Active</p>
                <p className="text-sm text-gray-600">Account Status</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent orders */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
              <Link 
                href="/account/orders"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
              >
                <span>View all</span>
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>
          
          <div className="p-6">
            {recentOrders.length > 0 ? (
              <div className="space-y-4">
                {recentOrders.slice(0, 3).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">#{order.orderNumber}</p>
                      <p className="text-sm text-gray-600">
                        {order.itemCount} items • {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">৳{order.totalAmount.toLocaleString()}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                        order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'PROCESSING' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ShoppingBagIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No orders yet</h3>
                <p className="mt-1 text-sm text-gray-500">Start shopping to see your orders here.</p>
                <div className="mt-6">
                  <Link
                    href="/search"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Start Shopping
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/account/orders"
            className="bg-white border rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="text-center">
              <ShoppingBagIcon className="mx-auto h-8 w-8 text-blue-600 mb-2" />
              <p className="font-medium text-gray-900">View Orders</p>
              <p className="text-sm text-gray-500">Track your purchases</p>
            </div>
          </Link>

          <Link
            href="/account/profile"
            className="bg-white border rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="text-center">
              <UserIcon className="mx-auto h-8 w-8 text-green-600 mb-2" />
              <p className="font-medium text-gray-900">Edit Profile</p>
              <p className="text-sm text-gray-500">Update your information</p>
            </div>
          </Link>

          <Link
            href="/account/addresses"
            className="bg-white border rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="text-center">
              <TruckIcon className="mx-auto h-8 w-8 text-orange-600 mb-2" />
              <p className="font-medium text-gray-900">Addresses</p>
              <p className="text-sm text-gray-500">Manage shipping</p>
            </div>
          </Link>

          <Link
            href="/account/security"
            className="bg-white border rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="text-center">
              <ShieldCheckIcon className="mx-auto h-8 w-8 text-purple-600 mb-2" />
              <p className="font-medium text-gray-900">Security</p>
              <p className="text-sm text-gray-500">Password & settings</p>
            </div>
          </Link>
        </div>
      </div>
    </AccountLayout>
  );
}
```

## 1.3 Checkout Address Integration
**Critical:** Update checkout to integrate with account addresses

### Update Checkout Page Address Section
**File:** `src/app/checkout/page.tsx` (modify existing shipping address section)

```typescript
// Add this component within the existing CheckoutForm
function ShippingAddressSection({ user }: { user: any }) {
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAddresses = async () => {
      try {
        const response = await fetch('/api/account/addresses');
        if (response.ok) {
          const data = await response.json();
          setSavedAddresses(data.addresses || []);
          
          // Auto-select default address if available
          const defaultAddress = data.addresses.find(addr => addr.isDefault);
          if (defaultAddress) {
            setSelectedAddressId(defaultAddress.id.toString());
          } else if (data.addresses.length === 0) {
            setShowNewAddressForm(true);
          }
        }
      } catch (error) {
        console.error('Failed to load addresses:', error);
        setShowNewAddressForm(true); // Fallback to new address form
      } finally {
        setLoading(false);
      }
    };

    loadAddresses();
  }, []);

  if (loading) {
    return <div className="animate-pulse h-32 bg-gray-200 rounded"></div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Shipping Address
      </h2>

      {/* Saved Addresses */}
      {savedAddresses.length > 0 && !showNewAddressForm && (
        <div className="space-y-3 mb-4">
          {savedAddresses.map((address) => (
            <label
              key={address.id}
              className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedAddressId === address.id.toString()
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="address"
                value={address.id}
                checked={selectedAddressId === address.id.toString()}
                onChange={(e) => setSelectedAddressId(e.target.value)}
                className="sr-only"
              />
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-gray-900">{address.name}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {address.street1}
                    {address.street2 && <>, {address.street2}</>}
                  </div>
                  <div className="text-sm text-gray-600">
                    {address.city}, {address.state} {address.postalCode}
                  </div>
                  <div className="text-sm text-gray-600">{address.country}</div>
                  {address.isDefault && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-2">
                      Default Address
                    </span>
                  )}
                </div>
              </div>
            </label>
          ))}
        </div>
      )}

      {/* Toggle between saved addresses and new address form */}
      <div className="flex items-center space-x-4 mb-4">
        {savedAddresses.length > 0 && (
          <button
            type="button"
            onClick={() => setShowNewAddressForm(!showNewAddressForm)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {showNewAddressForm ? 'Use Saved Address' : 'Use Different Address'}
          </button>
        )}
        
        <Link
          href="/account/addresses"
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          target="_blank"
        >
          Manage Addresses →
        </Link>
      </div>

      {/* New Address Form (fallback to existing Stripe AddressElement) */}
      {(showNewAddressForm || savedAddresses.length === 0) && (
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-3">
            {savedAddresses.length > 0 ? 'New Address' : 'Enter Shipping Address'}
          </h3>
          <AddressElement
            options={{
              mode: 'shipping',
              fields: { phone: 'always' },
              validation: { phone: { required: 'always' } },
              defaultValues: {
                name: user?.firstName && user?.lastName 
                  ? `${user.firstName} ${user.lastName}` 
                  : '',
                address: {
                  line1: '',
                  line2: '',
                  city: '',
                  state: '',
                  postal_code: '',
                  country: 'US',
                },
                phone: user?.phone || '',
              },
            }}
          />
          
          {savedAddresses.length > 0 && (
            <div className="mt-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">
                  Save this address for future orders
                </span>
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### Address API Integration
**File:** `src/app/api/account/addresses/route.ts` (basic version for checkout)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const addresses = await prisma.address.findMany({
      where: { userId: parseInt(session.user.id) },
      orderBy: [
        { isDefault: 'desc' }, // Default address first
        { createdAt: 'desc' }   // Then by creation date
      ]
    });

    return NextResponse.json({ 
      success: true, 
      addresses 
    });

  } catch (error) {
    console.error('Address fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch addresses' },
      { status: 500 }
    );
  }
}
```

---

# PHASE 2: EMAIL CONFIRMATION INFRASTRUCTURE (1.5 days)

## 2.1 Email Service Setup
**Service:** Resend (Modern, Developer-Friendly)

### Environment Variables:
**File:** `.env.local`
```env
# Resend Email Configuration
RESEND_API_KEY=your_resend_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

## 2.2 Database Schema Updates
**File:** `prisma/schema.prisma`

### Add Email Verification Token model:
```prisma
model EmailVerificationToken {
  id        Int      @id @default(autoincrement())
  userId    Int      @map("user_id")
  token     String   @unique
  newEmail  String   @map("new_email")
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([token])
  @@index([expiresAt])
  @@map("email_verification_tokens")
}
```

### Update User model:
```prisma
model User {
  // ... existing fields
  phoneVerificationPending String?                  @map("phone_verification_pending")
  emailVerificationTokens  EmailVerificationToken[]
}
```

**Commands to run:**
```bash
npx prisma migrate dev --name add-email-confirmation
npx prisma generate
```

## 2.3 Email Service Implementation
**File:** `src/lib/email.ts`

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  try {
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to,
      subject,
      html,
    });

    console.log(`📧 Email sent to ${to}: ${result.data?.id}`);
    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error('❌ Email send failed:', error);
    return { success: false, error: error.message };
  }
}

export function generateEmailConfirmationTemplate(confirmUrl: string, newEmail: string): { html: string, subject: string } {
  const subject = 'Confirm your new email address - UniShopper';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin: 0; font-size: 28px;">UniShopper</h1>
        <p style="color: #6b7280; margin-top: 8px;">E-commerce Platform</p>
      </div>
      
      <div style="background: #f8fafc; border-radius: 12px; padding: 32px; margin: 24px 0;">
        <h2 style="color: #1f2937; margin-bottom: 16px; font-size: 24px;">Confirm your new email address</h2>
        
        <p style="color: #4b5563; margin-bottom: 24px; font-size: 16px;">
          You requested to change your email address to <strong>${newEmail}</strong>. 
          Click the button below to confirm this change.
        </p>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${confirmUrl}" 
             style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
            Confirm Email Address
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
          This link will expire in 24 hours for security reasons.
        </p>
        
        <p style="color: #9ca3af; font-size: 14px; margin-top: 16px;">
          If you didn't request this change, you can safely ignore this email.
        </p>
      </div>
      
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; margin-top: 32px;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          © 2024 UniShopper. All rights reserved.
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin: 4px 0 0 0;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <span style="word-break: break-all;">${confirmUrl}</span>
        </p>
      </div>
    </body>
    </html>
  `;

  return { html, subject };
}
```

## 2.4 Email Confirmation Service
**File:** `src/lib/email-confirmation.ts`

```typescript
import { prisma } from '@/lib/prisma';
import { sendEmail, generateEmailConfirmationTemplate } from '@/lib/email';
import crypto from 'crypto';

export async function generateEmailConfirmationToken(userId: number, newEmail: string) {
  // Clean up any existing tokens for this user
  await prisma.emailVerificationToken.deleteMany({
    where: { userId }
  });

  // Generate secure token
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Store token
  await prisma.emailVerificationToken.create({
    data: {
      userId,
      token,
      newEmail: newEmail.toLowerCase(),
      expiresAt
    }
  });

  return token;
}

export async function sendEmailConfirmation(userId: number, newEmail: string) {
  try {
    const token = await generateEmailConfirmationToken(userId, newEmail);
    const confirmUrl = `${process.env.NEXTAUTH_URL}/api/confirm-email?token=${token}`;
    
    const { html, subject } = generateEmailConfirmationTemplate(confirmUrl, newEmail);
    
    const result = await sendEmail({
      to: newEmail,
      subject,
      html
    });

    return {
      success: result.success,
      token: process.env.NODE_ENV === 'development' ? token : undefined
    };
  } catch (error) {
    console.error('Email confirmation send error:', error);
    return { success: false, error: error.message };
  }
}

export async function verifyEmailConfirmationToken(token: string) {
  const verification = await prisma.emailVerificationToken.findUnique({
    where: { token },
    include: { user: true }
  });

  if (!verification) {
    throw new Error('Invalid verification token');
  }

  if (new Date() > verification.expiresAt) {
    // Clean up expired token
    await prisma.emailVerificationToken.delete({
      where: { id: verification.id }
    });
    throw new Error('Verification token has expired');
  }

  // Update user email
  await prisma.user.update({
    where: { id: verification.userId },
    data: { email: verification.newEmail }
  });

  // Clean up used token
  await prisma.emailVerificationToken.delete({
    where: { id: verification.id }
  });

  return {
    success: true,
    user: verification.user,
    newEmail: verification.newEmail
  };
}
```

---

# PHASE 3: PROFILE MANAGEMENT (2-3 days)

## 2.1 Profile API Endpoints
**File:** `src/app/api/account/profile/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  phone: z.string().min(1, 'Phone is required').optional(),
  country: z.string().min(1, 'Country is required').optional(),
});

// GET - Get current profile
export async function GET(request: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: parseInt(session.user.id) },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      country: true,
      phoneVerified: true,
      phoneVerificationPending: true,
      emailVerificationPending: true,
      createdAt: true,
    }
  });

  return NextResponse.json({ user });
}

// PUT - Update profile
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(session.user.id) },
      data: validatedData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        country: true,
        phoneVerified: true,
      }
    });

    return NextResponse.json({ 
      success: true, 
      user: updatedUser 
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## 2.2 Email Change API
**File:** `src/app/api/account/change-email/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmailConfirmation } from '@/lib/email-confirmation';
import { z } from 'zod';
import * as argon2 from 'argon2';

const changeEmailSchema = z.object({
  newEmail: z.string().email('Invalid email format'),
  currentPassword: z.string().min(1, 'Current password is required'),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { newEmail, currentPassword } = changeEmailSchema.parse(body);

    // Verify current password
    const user = await prisma.user.findUnique({
      where: { id: parseInt(session.user.id) }
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const passwordValid = await argon2.verify(user.password, currentPassword);
    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Check if new email is already in use
    const existingUser = await prisma.user.findUnique({
      where: { email: newEmail.toLowerCase() }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email is already in use' },
        { status: 400 }
      );
    }

    // Send confirmation email to new address
    const result = await sendEmailConfirmation(
      parseInt(session.user.id), 
      newEmail.toLowerCase()
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Confirmation email sent to your new email address. Please check your inbox and click the link to confirm.',
        ...(result.token && { token: result.token }) // Dev only
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send confirmation email' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Email change error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## 2.3 Email Confirmation Handler API
**File:** `src/app/api/confirm-email/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyEmailConfirmationToken } from '@/lib/email-confirmation';
import { redirect } from 'next/navigation';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/account/profile?error=invalid-token', request.url));
  }

  try {
    const result = await verifyEmailConfirmationToken(token);
    
    if (result.success) {
      // Redirect to account page with success message
      return NextResponse.redirect(
        new URL(`/account/profile?success=email-updated&email=${encodeURIComponent(result.newEmail)}`, request.url)
      );
    }
  } catch (error) {
    console.error('Email confirmation error:', error);
    
    if (error.message.includes('expired')) {
      return NextResponse.redirect(new URL('/account/profile?error=token-expired', request.url));
    } else {
      return NextResponse.redirect(new URL('/account/profile?error=invalid-token', request.url));
    }
  }
}
```

## 2.3 Phone Change API
**File:** `src/app/api/account/change-phone/route.ts`

```typescript
// Similar structure to email change but for phone numbers
// Send SMS OTP to new phone number
// Store in phoneVerificationPending field
```

## 2.4 Profile Settings Component
**File:** `src/app/account/profile/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';

interface UserProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  phoneVerified: boolean;
  phoneVerificationPending?: string;
  emailVerificationPending?: string;
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    country: '',
  });

  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch('/api/account/profile');
        const data = await response.json();
        
        if (data.user) {
          setProfile(data.user);
          setFormData({
            firstName: data.user.firstName || '',
            lastName: data.user.lastName || '',
            phone: data.user.phone || '',
            country: data.user.country || '',
          });
        }
      } catch (error) {
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      loadProfile();
    }
  }, [session]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch('/api/account/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      
      if (result.success) {
        setProfile(result.user);
        toast.success('Profile updated successfully');
      } else {
        toast.error(result.error || 'Failed to update profile');
      }
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading profile...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>
      
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">First Name</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Last Name</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        {/* Email section with verification status */}
        <div>
          <label className="block text-sm font-medium mb-2">Email Address</label>
          <div className="flex items-center space-x-3">
            <input
              type="email"
              value={profile?.email || ''}
              className="flex-1 p-3 border rounded-lg bg-gray-50"
              disabled
            />
            <button
              type="button"
              className="px-4 py-3 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
            >
              Change Email
            </button>
          </div>
          {profile?.emailVerificationPending && (
            <p className="text-amber-600 text-sm mt-2">
              Verification pending for: {profile.emailVerificationPending}
            </p>
          )}
        </div>

        {/* Phone section with verification status */}
        <div>
          <label className="block text-sm font-medium mb-2">Phone Number</label>
          <div className="flex items-center space-x-3">
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex items-center space-x-2">
              {profile?.phoneVerified ? (
                <span className="text-green-600 text-sm">✓ Verified</span>
              ) : (
                <button
                  type="button"
                  className="px-4 py-3 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
                >
                  Verify Phone
                </button>
              )}
            </div>
          </div>
          {profile?.phoneVerificationPending && (
            <p className="text-amber-600 text-sm mt-2">
              Verification pending for: {profile.phoneVerificationPending}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Country</label>
          <select
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Country</option>
            <option value="BD">Bangladesh</option>
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="GB">United Kingdom</option>
            <option value="AU">Australia</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
```

---

# PHASE 3: ADDRESS MANAGEMENT (2-3 days)

## 3.1 Address API Endpoints
**File:** `src/app/api/account/addresses/route.ts`

```typescript
// GET - List all addresses for user
// POST - Create new address
```

**File:** `src/app/api/account/addresses/[id]/route.ts`

```typescript
// GET - Get specific address
// PUT - Update address
// DELETE - Delete address
```

## 3.2 Address Management Component
**File:** `src/app/account/addresses/page.tsx` (replace existing)

Full CRUD interface for managing addresses with:
- Add new address form
- Edit existing addresses
- Delete addresses
- Set default address
- Address validation

---

# PHASE 4: SECURITY SETTINGS (2 days)

## 4.1 Password Change API
**File:** `src/app/api/account/change-password/route.ts`

```typescript
// Require current password
// Validate new password strength  
// Hash and update password
// Invalidate all sessions except current
```

## 4.2 Security Settings Component
**File:** `src/app/account/security/page.tsx`

- Change password form
- 2FA toggle (prepare for SMS integration)
- Login activity log
- Account deactivation option

---

# DEVELOPMENT CHECKLIST

## Phase 1 Account Layout & Dashboard:
- [ ] **1.1** TEST: Account layout renders correctly on desktop and mobile
- [ ] **1.2** Create dashboard API endpoints
- [ ] **1.4** CRITICAL: Implement checkout address integration
- [ ] **1.4** Add "Manage Addresses" link to account/addresses page
- [ ] **1.4** Implement basic addresses API endpoint for checkout
- [ ] **1.4** TEST: Checkout shows saved addresses and allows selection
- [ ] **1.5** Migrate existing orders pages to account structure
- [ ] **1.5** Update all internal links to use new `/account/orders` paths
- [ ] **1.5** TEST: Order pages work within account structure

## Phase 1.5 Addresses :
- [x ] **1.1** TEST: Address layout renders correctly on desktop and mobile
- [x ] **1.2** Make view addresses in `/account` a button
- [x ] **1.3** In `/account/addresses` remove left dashboard
- [ X ] **1.4** In `/account/addresses` Their default addresses which they used to sign up should be there as the default option
- [ X ] **1.5** TEST: In our database we should make sure that all these fields for addresses can be captured (,First name, Last Name, Street Address (line 1), City,Country, Zip/Code,   Phone Number, Name/Label (e.g., "Home", "Work", "Mom's House"), Street Address line 2,company name, province state). We should also make sure if addresses are updated in the addresses section they are updated and if deleted they are deleted from the database. If these do not exist then create them.
- [ x] **1.55** In `/account/addresses` You should be able to edit the default and all address which you have set using an edit button
- [x ] **1.6** In `/account/addresses` editing any address should allow you to enter mandatory fields  ,First name, Last Name, Street Address (line 1), City,Country, Zip/Code,   Phone Number,
- [x ] **1.65**  Make sure when editing all the fields that have been previously filled are already populated. For example if I have first name populated as a result of sign up, when editing the form, the form should already show the first name that I have put. Same thing for all fields.
- [ x] **1.7** In `/account/addresses` editing any address should allow you to enter optional fields Name/Label (e.g., "Home", "Work", "Mom's House"), Street Address line 2,company name
- [ x ] **1.8** In `/account/addresses` use react-select-country-list + world-countries to make sure all countries are listed and based on the country state/province list gets populated and becomes mandatory
- [ x ] **1.85** In signup make sure we use react-select-country-list + world-countries as well.
- [ x] **1.9** In `/account/addresses` you should be able to add new addresses similarly as you edit it, only it should give you a new form with no information populated. 
- [ x] **1.95** When creating new address you should have the option to make it the default address, you should have the option to make any of the ones you want as your default address.
- [ x] **1.10** In `/account/addresses` you should be able to delete new addresses with a delete button
- [ x ] **1.10** TEST: Create an address and make sure it reaches the database with all information. Make it the default address in this example.
- [ x ] **1.11** TEST: Update an address and make sure it reaches the database with all information
- [ x ] **1.12** TEST: Delete an address and make sure it reaches the database with all information. Make sure it 
- [ x ] **1.125** Set as default doesnt work in the adresses page, also should be bigger and have hover.


## Phase 1.6 Checkout Address Integration :
- [ ] **1.1** TEST: Address checkout renders correctly on desktop and mobile
- [ ] **1.2** Checkout should default your default address, as we know in some cases default addresses can have name city but other cases a lot more information


## Phase 2 Email Infrastructure:
- [ ] **2.1** Sign up for Resend account and get API key
- [ ] **2.1** Add Resend environment variables to `.env.local`
- [ ] **2.1** TEST: Resend credentials work (send test email)
- [ ] **2.2** Add EmailVerificationToken model to Prisma schema
- [ ] **2.2** Update User model with emailVerificationTokens relation
- [ ] **2.2** Run `npx prisma migrate dev --name add-email-confirmation`
- [ ] **2.2** Run `npx prisma generate`
- [ ] **2.2** TEST: Database migration runs without errors
- [ ] **2.3** Install Resend package: `npm install resend`
- [ ] **2.3** Create `src/lib/email.ts` with email service
- [ ] **2.3** Implement `sendEmail` function with Resend
- [ ] **2.3** Implement `generateEmailConfirmationTemplate` function
- [ ] **2.3** TEST: Email service sends professional HTML emails
- [ ] **2.4** Create `src/lib/email-confirmation.ts` service
- [ ] **2.4** Implement `generateEmailConfirmationToken` function
- [ ] **2.4** Implement `sendEmailConfirmation` function
- [ ] **2.4** Implement `verifyEmailConfirmationToken` function
- [ ] **2.4** TEST: Token generation, email sending, and verification works
- [ ] **2.5** Create `src/app/api/confirm-email/route.ts`
- [ ] **2.5** Implement GET handler for email confirmation links
- [ ] **2.5** Add proper redirect handling with success/error states
- [ ] **2.5** TEST: Email confirmation links work end-to-end
- [ ] **2.6** TEST: Token expiration works (24 hours)
- [ ] **2.6** TEST: Invalid/expired token handling works

## Phase 3 Profile Management:
- [ ] **2.1** Create `src/app/api/account/profile/route.ts`
- [ ] **2.1** Implement GET handler for fetching profile
- [ ] **2.1** Implement PUT handler for updating profile
- [ ] **2.1** Add proper validation and error handling
- [ ] **2.1** TEST: Profile API endpoints work via Postman
- [ ] **2.2** Create `src/app/api/account/change-email/route.ts`
- [ ] **2.2** Implement email change with current password verification
- [ ] **2.2** Add duplicate email check
- [ ] **2.2** Store pending email in database
- [ ] **2.2** TEST: Email change process works end-to-end
- [ ] **2.3** Create `src/app/api/account/change-phone/route.ts`
- [ ] **2.3** Implement phone change with SMS verification
- [ ] **2.3** Store pending phone in database
- [ ] **2.3** TEST: Phone change process works end-to-end
- [ ] **2.4** Create `src/app/account/profile/page.tsx`
- [ ] **2.4** Build profile editing form
- [ ] **2.4** Add real-time validation
- [ ] **2.4** Add loading and success states
- [ ] **2.4** Show verification status for email/phone
- [ ] **2.4** TEST: Profile editing UI works completely
- [ ] **2.5** Update main account page navigation
- [ ] **2.5** TEST: All profile flows work from main account page

## Phase 3 Address Management:
- [ ] **3.1** Create `src/app/api/account/addresses/route.ts`
- [ ] **3.1** Implement GET handler (list addresses)
- [ ] **3.1** Implement POST handler (create address)
- [ ] **3.1** Add proper validation for address fields
- [ ] **3.1** TEST: Address listing and creation APIs work
- [ ] **3.2** Create `src/app/api/account/addresses/[id]/route.ts`
- [ ] **3.2** Implement GET handler (get single address)
- [ ] **3.2** Implement PUT handler (update address)
- [ ] **3.2** Implement DELETE handler (delete address)
- [ ] **3.2** Add authorization checks (user can only access own addresses)
- [ ] **3.2** TEST: Individual address operations work
- [ ] **3.3** Create address management UI
- [ ] **3.3** Replace placeholder `src/app/account/addresses/page.tsx`
- [ ] **3.3** Add address list with edit/delete options
- [ ] **3.3** Add new address form
- [ ] **3.3** Add default address selection
- [ ] **3.3** Add address validation
- [ ] **3.3** TEST: Complete address CRUD works in UI
- [ ] **3.4** TEST: Address management integrates with checkout flow
- [ ] **3.4** TEST: Default address selection works

## Phase 4 Security Settings:
- [ ] **4.1** Create `src/app/api/account/change-password/route.ts`
- [ ] **4.1** Implement password change with current password verification
- [ ] **4.1** Add new password strength validation
- [ ] **4.1** Hash new password with Argon2
- [ ] **4.1** TEST: Password change API works
- [ ] **4.2** Create `src/app/account/security/page.tsx`
- [ ] **4.2** Build password change form
- [ ] **4.2** Add password strength indicator
- [ ] **4.2** Add 2FA toggle (placeholder for SMS integration)
- [ ] **4.2** Add login activity section
- [ ] **4.2** TEST: Security settings UI works
- [ ] **4.3** Update main account page with security navigation
- [ ] **4.3** TEST: All security flows work
- [ ] **4.4** TEST: Password change doesn't break login
- [ ] **4.4** TEST: All account features work end-to-end

---

# TESTING CHECKLIST

## Email Confirmation Testing:
- [ ] Resend credentials work (test email send)
- [ ] Email confirmation templates render correctly
- [ ] Email confirmation tokens are generated and stored
- [ ] Email confirmation links work
- [ ] Token expiration works (24 hours)
- [ ] Invalid/expired token handling works

## Profile Management Testing:
- [ ] Profile data loads correctly
- [ ] Profile updates save to database
- [ ] Email change requires current password
- [ ] Email verification process works
- [ ] Phone change sends SMS OTP
- [ ] Phone verification process works
- [ ] Form validation works properly
- [ ] Error handling works correctly

## Address Management Testing:
- [ ] Address list loads correctly
- [ ] New address creation works
- [ ] Address editing works
- [ ] Address deletion works
- [ ] Default address selection works
- [ ] Address validation works
- [ ] Authorization checks work (users only see own addresses)

## Security Settings Testing:
- [ ] Password change requires current password
- [ ] New password validation works
- [ ] Password change doesn't break login
- [ ] Security UI loads correctly
- [ ] All security flows work

## Integration Testing:
- [ ] Account page navigation works to all sections
- [ ] All account features work while logged in
- [ ] Account data persists correctly
- [ ] No regression in existing functionality
- [ ] Mobile responsive design works
- [ ] Accessibility features work

---

# DEPLOYMENT NOTES

## Environment Variables:
```env
# Resend Email (add to existing)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

## Package Dependencies:
```bash
npm install resend
npm install react-hot-toast  # For notifications
```

## Database Migrations:
```bash
npx prisma migrate dev --name add-email-verification
npx prisma migrate dev --name add-account-features
npx prisma generate
```

---

# COST ESTIMATES

## Resend Pricing:
- 3000 emails/month: Free tier
- 50K emails/month: $20/month
- Professional templates and excellent deliverability

## Development Time:
- Phase 1: 1.5 days (email confirmation infrastructure)
- Phase 2: 2.5 days (account layout & dashboard with orders integration)
- Phase 3: 2-3 days (profile management with verification)
- Phase 4: 2-3 days (address management with CRUD)
- Phase 5: 2 days (security settings)
- **Total: 10-12 days** (increased due to comprehensive account unification)

---

# INTEGRATION WITH SMS/OTP PLAN

Once this Account System is complete, the SMS/OTP plan becomes much simpler:

1. **Phone verification** integrates with existing profile management
2. **Email OTP** already implemented
3. **Account settings** provide UI for managing verification
4. **Security flows** already established

The SMS/OTP plan would then focus purely on:
- Search API protection
- Login via SMS
- Order confirmation SMS
- Status update notifications

This creates a solid foundation for all future account-related features.