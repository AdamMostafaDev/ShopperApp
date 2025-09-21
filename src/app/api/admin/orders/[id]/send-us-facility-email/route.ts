import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendUSFacilityArrivalEmail } from '@/lib/klaviyo';
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

    console.log(`📦 Processing US facility email request for order ${orderId}`);

    // Fetch order details
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

    // Get display amounts for consistent pricing
    const amounts = getDisplayAmounts(order);

    // Prepare email data
    const emailData = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Valued Customer',
      customerEmail: order.user?.email || order.customerEmail,

      // Order details
      totalAmountBdt: amounts.totalAmountBdt,
      formattedTotalBdt: amounts.formattedTotalBdt,
      formattedTotalUsd: amounts.formattedTotalUsd,
      exchangeRate: order.exchangeRate || 121.5,

      // Items information
      items: Array.isArray(order.items) ? order.items : [],
      itemCount: Array.isArray(order.items) ? order.items.length : 0,

      // Shipping information
      customerAddress: order.shippingAddress,
      customerPhone: order.user?.phone || order.customerPhone,

      // Timeline information
      orderDate: order.createdAt,
      formattedOrderDate: order.createdAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    };

    console.log(`📧 Sending US facility arrival email to: ${emailData.customerEmail}`);

    // Send the email via Klaviyo
    const result = await sendUSFacilityArrivalEmail(emailData);

    if (result.success) {
      console.log(`✅ US facility arrival email sent successfully for order ${orderId}, Event ID: ${result.eventId}`);

      return NextResponse.json({
        success: true,
        message: 'US facility arrival email sent successfully',
        orderId: orderId,
        eventId: result.eventId
      });
    } else {
      console.error(`❌ Failed to send US facility email for order ${orderId}:`, result.error);

      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to send US facility email'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in US facility email endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}