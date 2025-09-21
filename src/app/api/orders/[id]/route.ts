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
      subtotal: order.productCostBdt ? Number(order.productCostBdt) : null,
      serviceCharge: order.serviceChargeBdt ? Number(order.serviceChargeBdt) : null,
      shipping: order.shippingCostBdt ? Number(order.shippingCostBdt) : null,
      tax: order.taxBdt ? Number(order.taxBdt) : null,
      totalAmount: order.totalAmountBdt ? Number(order.totalAmountBdt) : null,
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
      paymentConfirmationStatus: order.paymentStatus,
      shippedToUsStatus: order.shippedToUsStatus,
      shippedToBdStatus: order.shippedToBdStatus,
      domesticFulfillmentStatus: order.domesticFulfillmentStatus,
      deliveredStatus: order.deliveredStatus,
      // Pricing fields for display utils
      productCostBdt: order.productCostBdt ? Number(order.productCostBdt) : null,
      serviceChargeBdt: order.serviceChargeBdt ? Number(order.serviceChargeBdt) : null,
      shippingCostBdt: order.shippingCostBdt ? Number(order.shippingCostBdt) : null,
      taxBdt: order.taxBdt ? Number(order.taxBdt) : null,
      totalAmountBdt: order.totalAmountBdt ? Number(order.totalAmountBdt) : null,
      exchangeRate: order.exchangeRate ? Number(order.exchangeRate) : null,
      finalPricingUpdated: order.finalPricingUpdated || false,
      finalProductCostBdt: order.finalProductCostBdt ? Number(order.finalProductCostBdt) : null,
      finalServiceChargeBdt: order.finalServiceChargeBdt ? Number(order.finalServiceChargeBdt) : null,
      finalShippingCostBdt: order.finalShippingCostBdt ? Number(order.finalShippingCostBdt) : null,
      finalShippingOnlyBdt: order.finalShippingOnlyBdt ? Number(order.finalShippingOnlyBdt) : null,
      finalAdditionalFeesBdt: order.finalAdditionalFeesBdt ? Number(order.finalAdditionalFeesBdt) : null,
      feeDescription: order.feeDescription || null,
      finalTaxBdt: order.finalTaxBdt ? Number(order.finalTaxBdt) : null,
      finalTotalAmountBdt: order.finalTotalAmountBdt ? Number(order.finalTotalAmountBdt) : null,
      finalItems: order.finalItems || null,
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