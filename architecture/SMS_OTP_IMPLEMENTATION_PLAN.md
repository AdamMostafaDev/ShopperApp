# SMS/OTP Implementation Plan
*UniShopper E-commerce Platform*

## 🚨 MUST READ - CRITICAL REQUIREMENTS

**ALWAYS TEST AFTER EACH FEATURE:**
- Run `npm run build` to check for TypeScript/compile errors
- Test the specific feature you just implemented
- Verify existing functionality still works (no regressions)
- Check database operations work correctly
- Test API endpoints via browser dev tools or Postman

**CRITICAL USER FLOWS:**
1. **Sign In Page**: MUST ask for phone/email when user is not logged in
2. **Signup Flow**: MUST send OTP verification after user signs up with phone number
3. **Checkout**: MUST request phone verification if user has no verified phone
4. **Account Settings**: MUST show phone verification status and allow updates
5. **Error Handling**: SMS failures should NEVER break core flows (checkout, login, etc.)

**RATE LIMITING REQUIREMENTS:**
- 3 OTP requests maximum per hour per phone number
- 5 verification attempts maximum per OTP code
- Progressive delays on failed attempts

**PHONE NUMBER HANDLING:**
- Always format to international format (+88 for Bangladesh)
- Validate phone numbers before sending SMS
- Store verification status in database

---

## Overview
Complete implementation plan for SMS/OTP authentication system including search API protection.

## Current State Analysis
✅ **Already implemented:**
- Phone number collection in signup (`src/app/api/auth/signup/route.ts`)
- 2FA infrastructure (`twoFactorEnabled`, `two_factor_secret` in User model)
- NextAuth.js with custom JWT callbacks (`src/lib/auth.ts`)
- User model with required fields (`prisma/schema.prisma`)

## Implementation Timeline: 7-8 days total

---

# PHASE 1: CORE OTP INFRASTRUCTURE (2-3 days)

## 1.1 Database Schema Updates
**File:** `prisma/schema.prisma`

### Add to existing User model:
```prisma
model User {
  // ... existing fields
  phoneVerified     Boolean   @default(false) @map("phone_verified")
  phoneVerifiedAt   DateTime? @map("phone_verified_at")
  otpCodes          OtpCode[] // Add this relation
}
```

### New OtpCode model:
```prisma
model OtpCode {
  id          Int      @id @default(autoincrement())
  userId      Int?     @map("user_id")
  phone       String   // For guest checkout
  code        String
  type        OtpType
  expiresAt   DateTime @map("expires_at")
  isUsed      Boolean  @default(false) @map("is_used")
  attempts    Int      @default(0)
  createdAt   DateTime @default(now()) @map("created_at")
  user        User?    @relation(fields: [userId], references: [id])
  
  @@index([phone, type, isUsed])
  @@index([code, expiresAt])
  @@map("otp_codes")
}

enum OtpType {
  LOGIN_VERIFICATION
  PHONE_VERIFICATION  
  ORDER_CONFIRMATION
  PASSWORD_RESET
}
```

**Commands to run:**
```bash
npx prisma migrate dev --name add-otp-system
npx prisma generate
```

## 1.2 Environment Variables Setup
**File:** `.env.local`

Add Twilio credentials:
```env
# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

## 1.3 SMS Service Implementation
**File:** `src/lib/sms.ts`

```typescript
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export interface SendSMSOptions {
  to: string;
  message: string;
}

export async function sendSMS({ to, message }: SendSMSOptions) {
  try {
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });
    
    console.log(`📱 SMS sent to ${to}: ${result.sid}`);
    return { success: true, messageId: result.sid };
  } catch (error) {
    console.error('❌ SMS send failed:', error);
    return { success: false, error: error.message };
  }
}

export function formatPhoneNumber(phone: string): string {
  // Convert to international format
  // Handle Bangladesh numbers: +880 prefix
  if (phone.startsWith('01')) {
    return `+88${phone}`;
  }
  if (phone.startsWith('8801')) {
    return `+${phone}`;
  }
  if (!phone.startsWith('+')) {
    return `+${phone}`;
  }
  return phone;
}
```

## 1.4 OTP Service Implementation  
**File:** `src/lib/otp.ts`

```typescript
import { prisma } from '@/lib/prisma';
import { sendSMS } from '@/lib/sms';
import crypto from 'crypto';

export interface GenerateOTPOptions {
  userId?: number;
  phone: string;
  type: 'LOGIN_VERIFICATION' | 'PHONE_VERIFICATION' | 'ORDER_CONFIRMATION' | 'PASSWORD_RESET';
}

export interface VerifyOTPOptions {
  phone: string;
  code: string;
  type: string;
}

export async function generateAndSendOTP({ userId, phone, type }: GenerateOTPOptions) {
  // Rate limiting check
  const recentOTPs = await prisma.otpCode.count({
    where: {
      phone,
      type,
      createdAt: {
        gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
      }
    }
  });

  if (recentOTPs >= 3) {
    throw new Error('Too many OTP requests. Please try again later.');
  }

  // Generate 6-digit code
  const code = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  // Save to database
  await prisma.otpCode.create({
    data: {
      userId,
      phone,
      code,
      type,
      expiresAt
    }
  });

  // Send SMS
  const message = getOTPMessage(code, type);
  const smsResult = await sendSMS({ to: phone, message });

  return {
    success: smsResult.success,
    code: process.env.NODE_ENV === 'development' ? code : undefined // Only show in dev
  };
}

export async function verifyOTP({ phone, code, type }: VerifyOTPOptions) {
  const otpRecord = await prisma.otpCode.findFirst({
    where: {
      phone,
      code,
      type,
      isUsed: false,
      expiresAt: {
        gt: new Date()
      }
    },
    include: {
      user: true
    }
  });

  if (!otpRecord) {
    // Increment attempts for any matching non-expired OTP
    await prisma.otpCode.updateMany({
      where: {
        phone,
        type,
        isUsed: false,
        expiresAt: { gt: new Date() }
      },
      data: {
        attempts: { increment: 1 }
      }
    });
    
    throw new Error('Invalid or expired OTP code');
  }

  // Check attempt limit
  if (otpRecord.attempts >= 5) {
    throw new Error('Too many failed attempts. Please request a new code.');
  }

  // Mark as used
  await prisma.otpCode.update({
    where: { id: otpRecord.id },
    data: { isUsed: true }
  });

  return {
    success: true,
    user: otpRecord.user
  };
}

function getOTPMessage(code: string, type: string): string {
  switch (type) {
    case 'LOGIN_VERIFICATION':
      return `Your UniShopper login code is: ${code}. Valid for 5 minutes.`;
    case 'PHONE_VERIFICATION':
      return `Your UniShopper verification code is: ${code}. Valid for 5 minutes.`;
    case 'ORDER_CONFIRMATION':
      return `Your UniShopper order confirmation code is: ${code}. Valid for 5 minutes.`;
    case 'PASSWORD_RESET':
      return `Your UniShopper password reset code is: ${code}. Valid for 5 minutes.`;
    default:
      return `Your UniShopper verification code is: ${code}. Valid for 5 minutes.`;
  }
}
```

## 1.5 API Endpoints
**File:** `src/app/api/auth/send-otp/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateAndSendOTP } from '@/lib/otp';
import { formatPhoneNumber } from '@/lib/sms';
import { prisma } from '@/lib/prisma';

const sendOTPSchema = z.object({
  identifier: z.string().min(1, 'Email or phone is required'),
  type: z.enum(['LOGIN_VERIFICATION', 'PHONE_VERIFICATION', 'ORDER_CONFIRMATION', 'PASSWORD_RESET'])
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, type } = sendOTPSchema.parse(body);

    // Find user by email or phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { phone: identifier }
        ]
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found with this email or phone' },
        { status: 404 }
      );
    }

    if (!user.phone) {
      return NextResponse.json(
        { error: 'No phone number associated with this account' },
        { status: 400 }
      );
    }

    const formattedPhone = formatPhoneNumber(user.phone);
    const result = await generateAndSendOTP({
      userId: user.id,
      phone: formattedPhone,
      type
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'OTP sent successfully',
        phone: user.phone.slice(-4), // Show last 4 digits only
        ...(result.code && { code: result.code }) // Dev only
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send OTP' },
        { status: 500 }
      );
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**File:** `src/app/api/auth/verify-otp/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyOTP } from '@/lib/otp';
import { formatPhoneNumber } from '@/lib/sms';
import { prisma } from '@/lib/prisma';

const verifyOTPSchema = z.object({
  identifier: z.string().min(1, 'Email or phone is required'),
  code: z.string().length(6, 'Code must be 6 digits'),
  type: z.enum(['LOGIN_VERIFICATION', 'PHONE_VERIFICATION', 'ORDER_CONFIRMATION', 'PASSWORD_RESET'])
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, code, type } = verifyOTPSchema.parse(body);

    // Find user by email or phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { phone: identifier }
        ]
      }
    });

    if (!user || !user.phone) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const formattedPhone = formatPhoneNumber(user.phone);
    const result = await verifyOTP({
      phone: formattedPhone,
      code,
      type
    });

    if (result.success) {
      // Update phone verification status if verifying phone
      if (type === 'PHONE_VERIFICATION') {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            phoneVerified: true,
            phoneVerifiedAt: new Date()
          }
        });
      }

      return NextResponse.json({
        success: true,
        message: 'OTP verified successfully',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneVerified: type === 'PHONE_VERIFICATION' ? true : user.phoneVerified
        }
      });
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

# PHASE 2: SEARCH API PROTECTION (1 day)

## 2.1 Protect Search API
**File:** `src/app/api/search/route.ts` (modify existing)

Add authentication check at the top:
```typescript
import { getServerSession } from "next-auth/next"
import { authConfig } from "@/lib/auth"

export async function GET(request: Request) {
  // Add authentication check
  const session = await getServerSession(authConfig)
  
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required to search products" }, 
      { status: 401 }
    )
  }

  // Continue with existing search logic...
}
```

## 2.2 Update Search Page
**File:** `src/app/search/page.tsx` (modify existing)

Add authentication check:
```typescript
'use client';
import { useSession } from 'next-auth/react';
import { signIn } from 'next-auth/react';

export default function SearchPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Sign in to search</h2>
          <p className="text-gray-600 mb-6">
            You need to be signed in to search for products and access our shopping features.
          </p>
          <button
            onClick={() => signIn()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium w-full"
          >
            Sign In
          </button>
          <p className="text-sm text-gray-500 mt-4">
            Don't have an account? <a href="/signup" className="text-blue-600 hover:underline">Sign up</a>
          </p>
        </div>
      </div>
    );
  }

  // Continue with existing search component...
}
```

---

# PHASE 3: SMS LOGIN INTEGRATION (2-3 days)

## 3.1 Update NextAuth Configuration
**File:** `src/lib/auth.ts` (modify existing)

Add SMS provider to existing providers array:
```typescript
import { generateAndSendOTP, verifyOTP } from '@/lib/otp';

export const authConfig: NextAuthConfig = {
  // ... existing config
  providers: [
    // Keep existing Credentials provider
    Credentials({
      name: "credentials",
      // ... existing credentials config
    }),
    
    // Add new SMS provider
    Credentials({
      id: "sms",
      name: "SMS",
      credentials: {
        phone: { label: "Phone", type: "text" },
        code: { label: "Code", type: "text" }
      },
      async authorize(credentials) {
        const { phone, code } = credentials as { phone: string, code: string };
        
        try {
          const result = await verifyOTP({
            phone: formatPhoneNumber(phone),
            code,
            type: 'LOGIN_VERIFICATION'
          });

          if (result.success && result.user) {
            return {
              id: result.user.id.toString(),
              firstName: result.user.firstName,
              lastName: result.user.lastName,
              email: result.user.email,
            };
          }
        } catch (error) {
          console.error('SMS auth error:', error);
          return null;
        }

        return null;
      },
    }),
  ],
  // ... rest of existing config
}
```

## 3.2 Update Sign In Page
**File:** `src/app/signin/page.tsx` (modify existing)

Add SMS login option:
```typescript
'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';

export default function SignInPage() {
  const [loginMethod, setLoginMethod] = useState<'email' | 'sms'>('email');
  const [step, setStep] = useState<'identifier' | 'otp'>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOTP = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier,
          type: 'LOGIN_VERIFICATION'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setStep('otp');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setLoading(true);
    setError('');

    try {
      // Use NextAuth's signIn with SMS provider
      const result = await signIn('sms', {
        phone: identifier,
        code: otpCode,
        redirect: false
      });

      if (result?.error) {
        setError('Invalid OTP code');
      } else {
        // Redirect handled by NextAuth
        window.location.href = '/orders';
      }
    } catch (err) {
      setError('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-sm p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Sign In</h1>
        
        {/* Login method toggle */}
        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setLoginMethod('email')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
              loginMethod === 'email' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600'
            }`}
          >
            Email & Password
          </button>
          <button
            type="button" 
            onClick={() => setLoginMethod('sms')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
              loginMethod === 'sms' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600'
            }`}
          >
            Phone & SMS
          </button>
        </div>

        {loginMethod === 'email' ? (
          // Existing email/password form
          <div>
            {/* Your existing email/password form */}
          </div>
        ) : (
          // SMS login form
          <div>
            {step === 'identifier' ? (
              <div>
                <input
                  type="text"
                  placeholder="Email or phone number"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full p-3 border rounded-lg mb-4"
                />
                <button
                  onClick={handleSendOTP}
                  disabled={loading || !identifier}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-4">
                  Enter the 6-digit code sent to your phone
                </p>
                <input
                  type="text"
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-full p-3 border rounded-lg mb-4 text-center text-2xl tracking-widest"
                  maxLength={6}
                />
                <button
                  onClick={handleVerifyOTP}
                  disabled={loading || otpCode.length !== 6}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 mb-2"
                >
                  {loading ? 'Verifying...' : 'Sign In'}
                </button>
                <button
                  onClick={() => setStep('identifier')}
                  className="w-full text-blue-600 py-2"
                >
                  Back
                </button>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

# PHASE 4: ORDER SMS NOTIFICATIONS (1-2 days)

## 4.1 Order Confirmation SMS
**File:** `src/app/api/create-payment-intent/route.ts` (modify existing)

Add SMS notification after order creation:
```typescript
// After creating order in database, add:
import { generateAndSendOTP } from '@/lib/otp';

// After order creation logic:
if (order.customerPhone) {
  try {
    await generateAndSendOTP({
      userId: order.userId,
      phone: order.customerPhone,
      type: 'ORDER_CONFIRMATION'
    });
  } catch (error) {
    console.error('Failed to send order confirmation SMS:', error);
    // Don't fail the order creation if SMS fails
  }
}
```

## 4.2 Order Status Update SMS
**File:** `src/lib/order-notifications.ts`

```typescript
import { sendSMS } from '@/lib/sms';
import { prisma } from '@/lib/prisma';

export async function sendOrderStatusSMS(orderId: number, status: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true }
    });

    if (!order || !order.customerPhone) {
      return;
    }

    let message = '';
    switch (status) {
      case 'PROCESSING':
        message = `Your UniShopper order #${order.orderNumber} is now being processed. We'll notify you when it ships!`;
        break;
      case 'SHIPPED':
        message = `Great news! Your UniShopper order #${order.orderNumber} has shipped and is on its way to you.`;
        break;
      case 'DELIVERED':
        message = `Your UniShopper order #${order.orderNumber} has been delivered. Thank you for shopping with us!`;
        break;
      default:
        message = `Your UniShopper order #${order.orderNumber} status has been updated to: ${status}`;
    }

    await sendSMS({
      to: order.customerPhone,
      message
    });

    console.log(`📱 Order status SMS sent for order ${order.orderNumber}`);
  } catch (error) {
    console.error('Failed to send order status SMS:', error);
  }
}
```

---

# DEVELOPMENT CHECKLIST

## Phase 1 OTP:


## Phase 2 Search Protection:
- [ ] **2.1** Modify existing `src/app/api/search/route.ts`
- [ ] **2.1** Add NextAuth session check
- [ ] **2.1** Return 401 for unauthenticated requests
- [ ] **2.1** TEST: API returns 401 when not logged in
- [ ] **2.2** Modify existing `src/app/search/page.tsx`
- [ ] **2.2** Add useSession hook
- [ ] **2.2** Add authentication check UI
- [ ] **2.2** Add sign-in prompt for guests (phone/email options)
- [ ] **2.2** TEST: Search page shows login prompt for guests
- [ ] **2.3** TEST: Search works normally for logged-in users
- [ ] **2.3** TEST: Login flow redirects properly after signin

## Phase 3 Auth Integration:
- [ ] **3.1** Modify `src/lib/auth.ts`
- [ ] **3.1** Add SMS credentials provider to NextAuth config
- [ ] **3.1** Import OTP verification functions
- [ ] **3.1** Add SMS authorize function
- [ ] **3.1** TEST: SMS provider works with NextAuth
- [ ] **3.2** Modify existing `src/app/signin/page.tsx`
- [ ] **3.2** CRITICAL: Ensure signin asks for phone/email when not logged in
- [ ] **3.2** Add login method toggle (email/SMS)
- [ ] **3.2** Add OTP input step
- [ ] **3.2** Add SMS login form
- [ ] **3.2** Integrate with NextAuth signIn
- [ ] **3.2** TEST: SMS login option appears on signin page
- [ ] **3.3** Modify `src/app/signup/page.tsx`
- [ ] **3.3** CRITICAL: Send OTP verification after signup with phone
- [ ] **3.3** Add phone verification step to signup flow
- [ ] **3.3** TEST: New users get OTP verification after signup
- [ ] **3.4** TEST: Send OTP button works
- [ ] **3.4** TEST: OTP verification completes login
- [ ] **3.4** TEST: Session creation works properly
- [ ] **3.4** TEST: Fallback to password works

## Phase 4 Checkout & Account Integration:
- [ ] **4.1** Modify `src/app/checkout/page.tsx`
- [ ] **4.1** CRITICAL: If no phone number, request OTP verification during checkout
- [ ] **4.1** Add phone verification step before payment
- [ ] **4.1** TEST: Checkout asks for phone verification if missing
- [ ] **4.2** Modify `src/app/account/page.tsx`
- [ ] **4.2** CRITICAL: Add phone verification section to account settings
- [ ] **4.2** Allow users to verify/update phone number
- [ ] **4.2** TEST: Account page shows phone verification status
- [ ] **4.3** Modify `src/app/api/create-payment-intent/route.ts`
- [ ] **4.3** Add order confirmation SMS after order creation
- [ ] **4.3** Handle SMS failures gracefully (don't break checkout)
- [ ] **4.3** TEST: Order confirmation SMS sent after payment
- [ ] **4.4** Create `src/lib/order-notifications.ts`
- [ ] **4.4** Implement `sendOrderStatusSMS` function
- [ ] **4.4** Add status message templates
- [ ] **4.4** Integrate with order update flows
- [ ] **4.4** TEST: Status update SMS works
- [ ] **4.5** TEST: SMS failures don't break order flow
- [ ] **4.5** TEST: All checkout flows work end-to-end

---

# TESTING CHECKLIST

## Phase 1 Testing :
- [ ] Database migration runs without errors
- [ ] Twilio credentials work (test with your phone)
- [ ] OTP generation and storage works
- [ ] SMS sending works (verify you receive messages)
- [ ] OTP verification works
- [ ] Rate limiting works (try sending >3 OTPs)
- [ ] OTP expiration works (wait 5+ minutes)

## Phase 2 Testing:
- [ ] Search API returns 401 when not logged in
- [ ] Search page shows login prompt for guests
- [ ] Search works normally for logged-in users
- [ ] Login flow redirects properly after signin

## Phase 3 Testing:
- [ ] SMS login option appears on signin page
- [ ] Send OTP button works
- [ ] OTP verification completes login
- [ ] Session creation works properly
- [ ] Fallback to password works

## Phase 4 Testing:
- [ ] Order confirmation SMS sent after successful payment
- [ ] SMS contains correct order information
- [ ] Status update SMS works
- [ ] SMS failures don't break order flow

---

# DEPLOYMENT NOTES

## Environment Variables to Add:
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token  
TWILIO_PHONE_NUMBER=your_twilio_number
```

## Package Dependencies to Install:
```bash
npm install twilio
npm install @types/twilio --save-dev
```

## Database Migrations:
```bash
npx prisma migrate dev --name add-otp-system
npx prisma generate
```

---

# COST ESTIMATES

## Twilio Pricing (Bangladesh):
- SMS to Bangladesh: ~$0.0075 per message
- Monthly estimates:
  - 100 orders: ~$3-5/month
  - 500 orders: ~$15-20/month  
  - 1000 orders: ~$30-40/month

## Development Time:
- Phase 1: 2-3 days (core infrastructure)
- Phase 2: 1 day (search protection)
- Phase 3: 2-3 days (auth integration)
- Phase 4: 1-2 days (order notifications)
- **Total: 6-9 days**

---

# NEXT STEPS

1. **Get Twilio Account**: Sign up and get credentials
2. **Start with Phase 1**: Database schema and basic OTP
3. **Test thoroughly**: Each phase before moving to next
4. **Deploy incrementally**: Deploy each phase separately
5. **Monitor costs**: Track SMS usage and costs

This plan provides a complete roadmap for implementing SMS/OTP authentication with search protection. Each phase is independent and can be deployed separately for gradual rollout.