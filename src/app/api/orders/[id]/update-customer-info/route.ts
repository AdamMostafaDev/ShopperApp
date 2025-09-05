import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authConfig);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const orderId = parseInt(id);
    if (isNaN(orderId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid order ID' },
        { status: 400 }
      );
    }

    const { paymentIntentId, shippingAddress } = await request.json();

    // Update order with customer information from Stripe
    const updatedOrder = await prisma.order.update({
      where: {
        id: orderId,
        userId: parseInt(session.user.id), // Ensure user owns this order
      },
      data: {
        stripePaymentIntentId: paymentIntentId,
        shippingAddress: shippingAddress,
        paymentStatus: 'PENDING', // Payment is pending confirmation
        orderPlacedStatus: 'COMPLETE', // Order is placed
        paymentConfirmationStatus: 'PENDING', // Payment confirmation happens later
      },
    });

    console.log(`✅ Order ${orderId} updated with customer info and payment success`);

    return NextResponse.json({
      success: true,
      order: updatedOrder
    });

  } catch (error) {
    console.error('Update customer info error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update customer information' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}