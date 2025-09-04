import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
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

    // Convert string ID to integer for database query
    const { id } = await params;
    const orderId = parseInt(id);
    if (isNaN(orderId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid order ID' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
        userId: parseInt(session.user.id), // Convert string to int
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Map database fields to expected format
    const mappedOrder = {
      id: order.id,
      orderNumber: order.orderNumber,
      items: order.items,
      subtotal: Number(order.productCostBdt),
      shippingCost: Number(order.shippingCostBdt),
      serviceCharge: Number(order.serviceChargeBdt),
      tax: Number(order.taxBdt || 0),
      totalAmount: Number(order.totalAmountBdt),
      status: order.status,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      shippingAddress: order.shippingAddress,
      stripePaymentIntentId: order.stripePaymentIntentId,
      currency: order.currency,
      createdAt: order.createdAt,
      refundDeadline: order.refundDeadline,
      // Order tracking statuses
      orderPlacedStatus: order.orderPlacedStatus,
      paymentConfirmationStatus: order.paymentConfirmationStatus,
      shippedStatus: order.shippedStatus,
      outForDeliveryStatus: order.outForDeliveryStatus,
      deliveredStatus: order.deliveredStatus,
    };

    return NextResponse.json({
      success: true,
      order: mappedOrder
    });

  } catch (error) {
    console.error('Order fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}