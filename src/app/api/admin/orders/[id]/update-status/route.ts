import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = parseInt(id);

    if (isNaN(orderId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid order ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { statusType, value } = body;

    // Validate inputs
    if (!statusType || !value) {
      return NextResponse.json(
        { success: false, error: 'Missing statusType or value' },
        { status: 400 }
      );
    }

    // Prepare update data based on status type
    let updateData: any = {};

    if (statusType === 'paymentStatus') {
      // Validate payment status value
      const validPaymentStatuses = ['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED'];
      if (!validPaymentStatuses.includes(value)) {
        return NextResponse.json(
          { success: false, error: 'Invalid payment status value' },
          { status: 400 }
        );
      }
      updateData.paymentStatus = value;

      // Auto-update shipping status when payment is confirmed
      if (value === 'PAID') {
        updateData.shippedToUsStatus = 'PROCESSING';
        console.log(`💰 Payment confirmed for order ${orderId} - Auto-updating US shipping to PROCESSING`);
      }
    } else if (statusType === 'shippedToUsStatus') {
      // Validate shipping status value
      const validShippingStatuses = ['PENDING', 'PROCESSING', 'COMPLETE'];
      if (!validShippingStatuses.includes(value)) {
        return NextResponse.json(
          { success: false, error: 'Invalid shipping status value' },
          { status: 400 }
        );
      }
      updateData.shippedToUsStatus = value;
    } else if (statusType === 'shippedToBdStatus') {
      // Validate international shipping status value
      const validShippingStatuses = ['PENDING', 'PROCESSING', 'COMPLETE'];
      if (!validShippingStatuses.includes(value)) {
        return NextResponse.json(
          { success: false, error: 'Invalid international shipping status value' },
          { status: 400 }
        );
      }
      updateData.shippedToBdStatus = value;

      // Auto-update domestic fulfillment when BD warehouse is complete
      if (value === 'COMPLETE') {
        updateData.domesticFulfillmentStatus = 'PROCESSING';
        console.log(`📦 BD warehouse arrival confirmed for order ${orderId} - Auto-updating domestic fulfillment to PROCESSING`);
      }
    } else if (statusType === 'domesticFulfillmentStatus') {
      // Validate domestic fulfillment status value
      const validFulfillmentStatuses = ['PENDING', 'PROCESSING', 'PICKUP', 'DELIVERY'];
      if (!validFulfillmentStatuses.includes(value)) {
        return NextResponse.json(
          { success: false, error: 'Invalid domestic fulfillment status value' },
          { status: 400 }
        );
      }
      updateData.domesticFulfillmentStatus = value;
    } else if (statusType === 'deliveredStatus') {
      // Validate delivered status value
      const validDeliveredStatuses = ['PENDING', 'PROCESSING', 'PICKUP_COMPLETE', 'DELIVERY_COMPLETE'];
      if (!validDeliveredStatuses.includes(value)) {
        return NextResponse.json(
          { success: false, error: 'Invalid delivered status value' },
          { status: 400 }
        );
      }
      updateData.deliveredStatus = value;
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid statusType. Supported: paymentStatus, shippedToUsStatus, shippedToBdStatus, domesticFulfillmentStatus, deliveredStatus' },
        { status: 400 }
      );
    }

    // Update the order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData
    });

    console.log(`✅ Updated ${statusType} to ${value} for order ${orderId}`);

    return NextResponse.json({
      success: true,
      message: `${statusType} updated successfully`,
      orderId: updatedOrder.id,
      updatedFields: updateData
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}