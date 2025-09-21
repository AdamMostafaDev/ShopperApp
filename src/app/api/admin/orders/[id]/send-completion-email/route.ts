import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPaymentConfirmationEmail } from '@/lib/klaviyo';
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

    console.log(`📧 Sending payment completion email for order ${orderId}`);

    // Get order details
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
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

    // Check if payment is actually completed
    if (order.paymentStatus !== 'PAID') {
      return NextResponse.json(
        { success: false, error: 'Order payment is not completed' },
        { status: 400 }
      );
    }

    // Get display amounts using the same logic as the frontend
    const amounts = getDisplayAmounts(order);

    // Prepare customer information
    const customerName = order.user
      ? `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim()
      : 'Customer';
    const customerEmail = order.user?.email || order.customerEmail;

    // Prepare items data
    const items = Array.isArray(order.items) ? order.items.map((item: any) => ({
      id: item.product?.id || item.id || 'unknown',
      title: item.product?.title || item.title || 'Product',
      price: item.price || 0,
      quantity: item.quantity || 1,
      image: item.product?.image || item.image || '',
      url: item.product?.url || item.url || '',
      store: item.product?.store || item.store || 'Unknown Store',
      originalPriceValue: item.product?.originalPriceValue || item.originalPriceValue || 0
    })) : [];

    // Send payment confirmation email
    const emailResult = await sendPaymentConfirmationEmail({
      orderId: order.id.toString(),
      orderNumber: order.orderNumber,
      customerEmail,
      customerName,
      customerPhone: order.customerPhone,
      shippingAddress: order.shippingAddress,
      items,
      stripePaymentIntentId: order.stripePaymentIntentId,

      // Use display amounts which handle final pricing logic
      productCostBdt: amounts.productCostBdt,
      serviceChargeBdt: amounts.serviceChargeBdt,
      shippingCostBdt: amounts.shippingCostBdt,
      finalShippingOnlyBdt: amounts.finalShippingOnlyBdt,
      finalAdditionalFeesBdt: amounts.finalAdditionalFeesBdt,
      feeDescription: amounts.feeDescription,
      taxBdt: amounts.taxBdt,
      totalAmountBdt: amounts.totalAmountBdt,

      // USD equivalents
      productCostUsd: Number(amounts.productCostBdt) / (Number(order.exchangeRate) || 121.5),
      serviceChargeUsd: Number(amounts.serviceChargeBdt) / (Number(order.exchangeRate) || 121.5),
      shippingCostUsd: Number(amounts.shippingCostBdt) / (Number(order.exchangeRate) || 121.5),
      taxUsd: Number(amounts.taxBdt) / (Number(order.exchangeRate) || 121.5),
      totalAmountUsd: Number(amounts.totalAmountBdt) / (Number(order.exchangeRate) || 121.5),

      exchangeRate: order.exchangeRate || 121.5,
      currency: order.currency || 'USD',
      orderDate: order.createdAt.toISOString()
    });

    if (emailResult.success) {
      console.log('✅ Payment confirmation email sent successfully');

      return NextResponse.json({
        success: true,
        message: 'Payment confirmation email sent successfully',
        orderId: order.id
      });
    } else {
      console.error('❌ Failed to send payment confirmation email:', emailResult.error);

      return NextResponse.json({
        success: false,
        error: emailResult.error || 'Failed to send email'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Payment confirmation email error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}