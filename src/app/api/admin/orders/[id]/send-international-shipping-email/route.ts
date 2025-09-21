import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendInternationalShippingEmail } from '@/lib/klaviyo';

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

    console.log(`✈️ Sending international shipping email for order ${orderId}`);

    // Send international shipping email via Klaviyo
    const emailResult = await sendInternationalShippingEmail(order);

    if (emailResult.success) {
      console.log(`✅ International shipping email sent successfully for order ${orderId}`);

      return NextResponse.json({
        success: true,
        message: 'International shipping email sent successfully',
        eventId: emailResult.eventId
      });
    } else {
      console.error(`❌ Failed to send international shipping email for order ${orderId}:`, emailResult.error);

      return NextResponse.json(
        {
          success: false,
          error: emailResult.error || 'Failed to send international shipping email'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in send-international-shipping-email API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}