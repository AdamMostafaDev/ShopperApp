import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendBDWarehouseArrivalEmail } from '@/lib/klaviyo';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = parseInt(id);

    // Fetch order with all related data
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true
      }
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    console.log(`🏢 Sending BD warehouse arrival email for order ${orderId}`);

    // Send BD warehouse arrival email via Klaviyo
    const emailResult = await sendBDWarehouseArrivalEmail(order);

    if (emailResult.success) {
      console.log(`✅ BD warehouse arrival email sent successfully for order ${orderId}`);

      return NextResponse.json({
        success: true,
        message: 'BD warehouse arrival email sent successfully',
        eventId: emailResult.eventId
      });
    } else {
      console.error(`❌ Failed to send BD warehouse arrival email for order ${orderId}:`, emailResult.error);

      return NextResponse.json(
        {
          success: false,
          error: emailResult.error || 'Failed to send BD warehouse arrival email'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in send-bd-warehouse-email API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}