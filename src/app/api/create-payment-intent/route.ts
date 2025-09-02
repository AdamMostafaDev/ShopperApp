import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    
    // Allow guest checkout - create guest user if no session
    const isGuest = !session?.user?.id;

    const { cartItems, totals, customerInfo } = await request.json();

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cart is empty' },
        { status: 400 }
      );
    }

    console.log('💰 Creating Payment Intent for totals:', totals);

    let userId = session?.user?.id;
    
    // For guest users, create a temporary guest user record
    if (isGuest) {
      const guestUser = await prisma.user.create({
        data: {
          email: customerInfo.email || `guest-${Date.now()}@unishopper.com`,
          email_lower: (customerInfo.email || `guest-${Date.now()}@unishopper.com`).toLowerCase(),
          firstName: 'Guest',
          lastName: 'User',
          role: 'USER',
        }
      });
      userId = guestUser.id;
    }

    // Create order in database first
    const order = await prisma.order.create({
      data: {
        userId: userId!,
        items: cartItems,
        subtotal: totals.subtotal,
        shippingCost: totals.shippingCost,
        serviceCharge: totals.serviceCharge,
        tax: totals.tax,
        totalAmount: totals.total,
        totalWeight: totals.totalWeight,
        customerEmail: customerInfo.email || session?.user?.email || `guest-${Date.now()}@unishopper.com`,
        shippingAddress: {}, // Will be filled by Payment Element
        refundDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        status: 'PENDING',
        paymentStatus: 'PENDING',
        fulfillmentStatus: 'PENDING'
      }
    });

    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totals.total * 100), // Convert to cents
      currency: 'bdt',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        orderId: order.id,
        userId: userId!,
        customerEmail: customerInfo.email || session?.user?.email || `guest-${Date.now()}@unishopper.com`,
        isGuest: isGuest.toString()
      },
      description: `Order for ${cartItems.length} items`,
      shipping: {
        name: session?.user ? `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim() || 'Customer' : 'Guest Customer',
        address: {
          country: 'BD', // Default to Bangladesh
        },
      },
    });

    // Update order with Payment Intent ID
    await prisma.order.update({
      where: { id: order.id },
      data: { 
        stripePaymentIntentId: paymentIntent.id 
      }
    });

    console.log('✅ Payment Intent created:', paymentIntent.id);

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      orderId: order.id
    });

  } catch (error) {
    console.error('Payment Intent creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create payment intent' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}