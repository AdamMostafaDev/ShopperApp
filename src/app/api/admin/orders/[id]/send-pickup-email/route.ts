import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPickupConfirmationEmail } from '@/lib/klaviyo';
import { getDisplayAmounts } from '@/lib/display-utils';

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

    // Fetch the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if domestic fulfillment is in PICKUP state
    if (order.domesticFulfillmentStatus !== 'PICKUP') {
      console.log(`⚠️ Order ${orderId} is not in PICKUP status`);
      return NextResponse.json({
        success: false,
        error: `Pickup confirmation email can only be sent when domestic fulfillment status is PICKUP. Current status: ${order.domesticFulfillmentStatus}`
      }, { status: 400 });
    }

    const customerName = order.user?.firstName || 'Customer';
    const customerEmail = order.user?.email || order.customerEmail;

    if (!customerEmail) {
      return NextResponse.json(
        { success: false, error: 'Customer email not found' },
        { status: 400 }
      );
    }

    console.log(`🏪 Sending pickup confirmation email to ${customerEmail} for order ${orderId}`);

    // Get display amounts for email
    const amounts = getDisplayAmounts(order as any);

    // Prepare items data - same as payment confirmation
    const items = Array.isArray(order.items) ? order.items.map((item: any) => ({
      id: item.product?.id || item.id || 'unknown',
      title: item.product?.title || item.title || item.name || 'Product',
      price: item.price || 0,
      quantity: item.quantity || 1,
      image: item.product?.image || item.image || item.imageUrl || '',
      url: item.product?.url || item.url || '',
      store: item.product?.store || item.store || item.storeName || 'Unknown Store',
      originalPriceValue: item.product?.originalPriceValue || item.originalPriceValue || 0
    })) : [];

    // Send the email via Klaviyo
    const result = await sendPickupConfirmationEmail({
      customerEmail,
      customerName,
      orderNumber: order.orderNumber,
      orderDate: order.createdAt,
      items,
      amounts,
      shippingAddress: order.shippingAddress as any,
      pickupDetails: order.pickupDetails as any
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    console.log(`✅ Pickup confirmation email sent successfully for order ${orderId}`);

    return NextResponse.json({
      success: true,
      message: 'Pickup confirmation email sent successfully',
      orderId: order.id,
      eventId: result.eventId
    });

  } catch (error) {
    console.error('Error sending pickup confirmation email:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send pickup confirmation email'
      },
      { status: 500 }
    );
  }
}