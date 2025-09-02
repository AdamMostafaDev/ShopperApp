import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log('🔔 Stripe webhook received:', event.type);

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        console.log('✅ Payment successful for Payment Intent:', paymentIntent.id);
        
        // Update order status
        const orderId = paymentIntent.metadata?.orderId;
        if (orderId) {
          // Get shipping address from Payment Intent
          const shippingAddress = paymentIntent.shipping?.address ? {
            name: paymentIntent.shipping.name,
            line1: paymentIntent.shipping.address.line1,
            line2: paymentIntent.shipping.address.line2,
            city: paymentIntent.shipping.address.city,
            state: paymentIntent.shipping.address.state,
            postal_code: paymentIntent.shipping.address.postal_code,
            country: paymentIntent.shipping.address.country,
          } : {};

          await prisma.order.update({
            where: { id: orderId },
            data: {
              paymentStatus: 'PAID',
              status: 'PROCESSING',
              shippingAddress: shippingAddress,
              updatedAt: new Date()
            }
          });
          
          console.log('📦 Order updated to PROCESSING:', orderId);
        }
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        console.log('✅ Payment successful for session:', session.id);
        
        // Update order status
        const orderId = session.metadata?.orderId;
        if (orderId) {
          await prisma.order.update({
            where: { id: orderId },
            data: {
              paymentStatus: 'PAID',
              status: 'PROCESSING',
              stripePaymentIntentId: session.payment_intent as string,
              updatedAt: new Date()
            }
          });
          
          console.log('📦 Order updated to PROCESSING:', orderId);
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        console.log('❌ Payment session expired:', session.id);
        
        // Update order status to cancelled
        const orderId = session.metadata?.orderId;
        if (orderId) {
          await prisma.order.update({
            where: { id: orderId },
            data: {
              paymentStatus: 'FAILED',
              status: 'CANCELLED',
              cancelledAt: new Date(),
              updatedAt: new Date()
            }
          });
          
          console.log('🗑️ Order cancelled due to expired session:', orderId);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        console.log('❌ Payment failed:', paymentIntent.id);
        
        // Find and update order
        const order = await prisma.order.findFirst({
          where: { stripePaymentIntentId: paymentIntent.id }
        });
        
        if (order) {
          await prisma.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: 'FAILED',
              status: 'CANCELLED',
              cancelledAt: new Date(),
              updatedAt: new Date()
            }
          });
          
          console.log('🗑️ Order cancelled due to payment failure:', order.id);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}