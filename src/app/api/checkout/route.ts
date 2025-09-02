import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { calculateCartTotals } from '@/lib/shipping';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { cartItems, shippingAddress, customerInfo } = await request.json();

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cart is empty' },
        { status: 400 }
      );
    }

    // Calculate totals using existing shipping logic
    const totals = calculateCartTotals(
      cartItems.map((item: any) => ({
        price: item.product.price,
        quantity: item.quantity,
        weight: item.product.weight
      }))
    );

    console.log('💰 Creating checkout session for totals:', totals);

    // Create order in database first
    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        items: cartItems,
        subtotal: totals.subtotal,
        shippingCost: totals.shippingCost,
        serviceCharge: totals.serviceCharge,
        totalAmount: totals.total,
        totalWeight: totals.totalWeight,
        customerEmail: customerInfo.email || session.user.email!,
        customerPhone: customerInfo.phone,
        shippingAddress: shippingAddress,
        refundDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        status: 'PENDING',
        paymentStatus: 'PENDING',
        fulfillmentStatus: 'PENDING'
      }
    });

    // Create line items for Stripe
    const lineItems = cartItems.map((item: any) => ({
      price_data: {
        currency: 'bdt',
        product_data: {
          name: item.product.title,
          images: item.product.image ? [item.product.image] : [],
          metadata: {
            product_id: item.product.id,
            store: item.product.store,
          }
        },
        unit_amount: Math.round(item.product.price * 100), // Convert to cents
      },
      quantity: item.quantity,
    }));

    // Add shipping as a line item
    if (totals.shippingCost > 0) {
      lineItems.push({
        price_data: {
          currency: 'bdt',
          product_data: {
            name: `Shipping (${totals.totalWeight.toFixed(1)}kg)`,
            description: 'International shipping to Bangladesh'
          },
          unit_amount: Math.round(totals.shippingCost * 100),
        },
        quantity: 1,
      });
    }

    // Add service charge as a line item
    if (totals.serviceCharge > 0) {
      lineItems.push({
        price_data: {
          currency: 'bdt',
          product_data: {
            name: 'Service Charge (5%)',
            description: 'Platform service fee'
          },
          unit_amount: Math.round(totals.serviceCharge * 100),
        },
        quantity: 1,
      });
    }

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      currency: 'bdt',
      customer_email: customerInfo.email || session.user.email!,
      metadata: {
        orderId: order.id,
        userId: session.user.id
      },
      success_url: `${process.env.NEXTAUTH_URL}/orders/${order.id}?success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/cart`,
      shipping_address_collection: {
        allowed_countries: ['BD', 'US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IN']
      },
      phone_number_collection: {
        enabled: true
      },
      allow_promotion_codes: false,
    });

    // Update order with Stripe checkout session ID
    await prisma.order.update({
      where: { id: order.id },
      data: { 
        stripeCheckoutId: checkoutSession.id 
      }
    });

    console.log('✅ Checkout session created:', checkoutSession.id);

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
      orderId: order.id
    });

  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create checkout session' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}