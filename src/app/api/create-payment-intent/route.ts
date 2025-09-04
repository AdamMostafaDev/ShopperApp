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

    // Calculate USD totals using original USD prices (not the converted BDT prices)
    const subtotalUsd = cartItems.reduce((sum: number, item: any) => {
      // Use originalPriceValue (USD) instead of price (BDT)
      const usdPrice = item.product.originalPriceValue || (item.product.price / 121.5); // fallback
      return sum + (usdPrice * item.quantity);
    }, 0);
    
    // Add service charge in USD (5% of subtotal)
    const serviceChargeUsd = subtotalUsd * 0.05;
    
    // Add taxes (8.875% of goods only, not service charge)
    const taxUsd = subtotalUsd * 0.08875;
    
    const totalAmountUsd = subtotalUsd + serviceChargeUsd + taxUsd;
    
    console.log('💵 USD Totals:', {
      subtotalUsd: subtotalUsd.toFixed(2),
      serviceChargeUsd: serviceChargeUsd.toFixed(2),
      taxUsd: taxUsd.toFixed(2),
      totalAmountUsd: totalAmountUsd.toFixed(2)
    });

    // Use your existing exchange rate service for now
    // TODO: Switch to Stripe's rates when available
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const rates = await response.json();
    const usdToBdtRate = rates.rates.BDT || 121.5; // Fallback rate
    console.log('💱 Current USD to BDT rate from Stripe:', usdToBdtRate);

    // Convert USD to BDT using Stripe's rate
    const subtotalBdt = Math.round(subtotalUsd * usdToBdtRate * 100) / 100;
    const serviceChargeBdt = Math.round(serviceChargeUsd * usdToBdtRate * 100) / 100;
    const taxBdt = Math.round(taxUsd * usdToBdtRate * 100) / 100;
    const totalAmountBdt = Math.round(totalAmountUsd * usdToBdtRate * 100) / 100;
    
    console.log('💰 BDT Totals (Stripe rate):', {
      subtotalBdt: subtotalBdt.toFixed(2),
      serviceChargeBdt: serviceChargeBdt.toFixed(2),
      taxBdt: taxBdt.toFixed(2),
      totalAmountBdt: totalAmountBdt.toFixed(2),
      rate: usdToBdtRate
    });

    let userId: number | null = session?.user?.id ? parseInt(session.user.id) : null;
    
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
      userId = guestUser.id; // Already an integer from database
    }

    // Get the next order number (100000 + order count)
    const orderCount = await prisma.order.count();
    const orderNumber = (100000 + orderCount).toString();

    // Create order in database first
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: userId!,
        items: cartItems,
        // BDT amounts (what customer sees/pays)
        productCostBdt: subtotalBdt,
        shippingCostBdt: 0, // Free shipping for now
        serviceChargeBdt: serviceChargeBdt,
        taxBdt: taxBdt, // 8.875% tax on goods only
        totalAmountBdt: totalAmountBdt,
        totalWeight: totals.totalWeight,
        
        // USD amounts (original prices for purchasing)
        productCostUsd: subtotalUsd,
        serviceChargeUsd: serviceChargeUsd,
        taxUsd: taxUsd,
        totalAmountUsd: totalAmountUsd,
        exchangeRate: usdToBdtRate,
        currency: 'BDT',
        exchangeRateProvider: 'exchange-api',
        
        customerEmail: customerInfo.email || session?.user?.email || `guest-${Date.now()}@unishopper.com`,
        shippingAddress: {}, // Will be filled by Payment Element
        refundDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        status: 'PENDING',
        paymentStatus: 'PENDING',
        fulfillmentStatus: 'PENDING',
        
        // Order tracking statuses with defaults
        orderPlacedStatus: 'COMPLETE',
        paymentConfirmationStatus: 'PROCESSING', 
        shippedStatus: 'PENDING',
        outForDeliveryStatus: 'PENDING',
        deliveredStatus: 'PENDING'
      }
    });

    // Create Payment Intent in USD (Stripe will show BDT equivalent to customer)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmountUsd * 100), // Convert USD to cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        orderId: order.id,
        userId: userId!,
        customerEmail: customerInfo.email || session?.user?.email || `guest-${Date.now()}@unishopper.com`,
        isGuest: isGuest.toString(),
        displayBdtAmount: totalAmountBdt.toString(),
        originalUsdAmount: totalAmountUsd.toString(),
        subtotalUsd: subtotalUsd.toString(),
        serviceChargeUsd: serviceChargeUsd.toString(),
        taxUsd: taxUsd.toString(),
        exchangeRate: usdToBdtRate.toString(),
        exchangeRateProvider: 'exchange-api'
      },
      description: `Order for ${cartItems.length} item${cartItems.length > 1 ? 's' : ''} (≈৳${totalAmountBdt.toFixed(2)} BDT)`,
      // Don't pre-set shipping - let AddressElement handle it
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