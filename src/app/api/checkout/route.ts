import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { calculateCartTotals } from '@/lib/shipping';
import { sendOrderConfirmationEmail } from '@/lib/klaviyo';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    
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

    // CRITICAL: Block checkout if any product has $0 price
    for (const item of cartItems) {
      if (!item.product.price || item.product.price <= 0) {
        console.error('🚨 BLOCKED: Attempting to checkout $0 product:', item.product.title);
        return NextResponse.json(
          { 
            success: false, 
            error: `Product "${item.product.title}" has invalid pricing. Please remove it from your cart and try again.`
          },
          { status: 400 }
        );
      }
    }

    console.log('✅ All products have valid pricing, proceeding with checkout');

    // Calculate totals using existing shipping logic
    const totals = calculateCartTotals(
      cartItems.map((item: any) => ({
        price: item.product.price,
        quantity: item.quantity,
        weight: item.product.weight
      }))
    );

    console.log('💰 Creating checkout session for totals:', totals);

    // Get the next order number (100000 + order count)
    const orderCount = await prisma.order.count();
    const orderNumber = (100000 + orderCount).toString();

    // Create order in database first
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: parseInt(session.user.id), // Convert string to int
        items: cartItems,
        productCostBdt: totals.subtotal,
        shippingCostBdt: totals.shippingCost,
        serviceChargeBdt: totals.serviceCharge,
        totalAmountBdt: totals.total,
        taxBdt: totals.tax || 0,
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
        stripePaymentIntentId: checkoutSession.payment_intent as string 
      }
    });

    console.log('✅ Checkout session created:', checkoutSession.id);

    // Send order confirmation email
    try {
      const finalCustomerEmail = customerInfo.email || session.user.email!;
      
      console.log('🔍 EMAIL DEBUG INFO:');
      console.log('- customerInfo.email:', customerInfo.email);
      console.log('- session.user.email:', session.user.email);
      console.log('- Final email to use:', finalCustomerEmail);
      console.log('- Order ID:', order.id);
      console.log('- Order Number:', order.orderNumber);
      
      const orderData = {
        orderId: order.id.toString(),
        orderNumber: order.orderNumber,
        customerEmail: finalCustomerEmail,
        customerName: customerInfo.name || session.user.name || 'Customer',
        items: cartItems.map((item: any) => ({
          id: item.product.id,
          title: item.product.title,
          price: item.product.price,
          originalPriceValue: item.product.originalPrice || (item.product.price / 121.17), // fallback exchange rate
          quantity: item.quantity,
          image: item.product.image || 'https://via.placeholder.com/100x100',
          url: item.product.url || '#',
          store: item.product.store || 'unknown'
        })),
        subtotalBdt: Number(totals.subtotal),
        serviceChargeBdt: Number(totals.serviceCharge),
        taxBdt: Number(totals.tax || 0),
        totalAmountBdt: Number(totals.total),
        subtotalUsd: Number(totals.subtotal) / 121.17, // Convert to USD
        serviceChargeUsd: Number(totals.serviceCharge) / 121.17,
        taxUsd: Number(totals.tax || 0) / 121.17,
        totalAmountUsd: Number(totals.total) / 121.17,
        exchangeRate: 121.17, // You might want to make this dynamic
        currency: 'BDT',
        orderDate: order.createdAt.toISOString()
      };

      console.log('📧 Sending order confirmation email to:', orderData.customerEmail);
      
      const emailResult = await sendOrderConfirmationEmail(orderData);
      
      if (emailResult.success) {
        console.log('✅ Order confirmation email sent successfully to:', orderData.customerEmail);
      } else {
        console.error('❌ Failed to send order confirmation email:', emailResult.error);
        // Don't fail the checkout if email fails
      }
    } catch (emailError) {
      console.error('❌ Error sending order confirmation email:', emailError);
      // Don't fail the checkout if email fails
    }

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