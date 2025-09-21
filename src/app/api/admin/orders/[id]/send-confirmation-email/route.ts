import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPriceConfirmationEmail } from '@/lib/klaviyo';
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

    // Fetch the order with user information
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
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

    // Check if final pricing has been set by admin
    if (!order.finalPricingUpdated) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot send pricing confirmation email. Final pricing has not been set yet. Please update the shipping costs and any additional fees first.'
        },
        { status: 400 }
      );
    }

    // Check that shipping cost is not 0 or null
    if (!order.finalShippingCostBdt || order.finalShippingCostBdt === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot send pricing confirmation email. Shipping cost has not been set. Please update the shipping cost first.'
        },
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
    const customerPhone = order.user?.phone || order.customerPhone;

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

    // Prepare payment confirmation data
    const paymentConfirmationData = {
      orderId: order.id.toString(),
      orderNumber: order.orderNumber,
      customerEmail,
      customerName,
      customerPhone,
      shippingAddress: order.shippingAddress,
      items,

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
    };

    // Check current payment status to determine email type and action
    const currentPaymentStatus = order.paymentStatus;
    let emailSubject = '';
    let statusUpdateMessage = '';
    let shouldUpdateStatus = false;

    if (currentPaymentStatus === 'PENDING') {
      emailSubject = 'Price Confirmation Request';
      shouldUpdateStatus = true;
      statusUpdateMessage = 'Status will be updated to PROCESSING';
    } else if (currentPaymentStatus === 'PROCESSING') {
      emailSubject = 'Payment Processing Update';
      shouldUpdateStatus = false;
      statusUpdateMessage = 'Payment is being processed';
    } else {
      return NextResponse.json(
        {
          success: false,
          error: `No update available for payment status: ${currentPaymentStatus}`
        },
        { status: 400 }
      );
    }

    console.log('🔍 Sending price confirmation for order:', orderId);
    console.log('📧 Email will be sent to:', customerEmail);
    console.log('📋 Current payment status:', currentPaymentStatus);
    console.log('📝 Email type:', emailSubject);
    console.log('💰 Order total BDT:', amounts.totalAmountBdt);
    console.log('📦 Shipping breakdown:', {
      finalShippingOnlyBdt: amounts.finalShippingOnlyBdt,
      finalAdditionalFeesBdt: amounts.finalAdditionalFeesBdt,
      feeDescription: amounts.feeDescription
    });

    // Send the price confirmation email via Klaviyo
    const result = await sendPriceConfirmationEmail(paymentConfirmationData);

    if (result.success) {
      // Only update payment status to PROCESSING if it's currently PENDING
      if (shouldUpdateStatus && currentPaymentStatus === 'PENDING') {
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: 'PROCESSING' }
        });
        console.log('✅ Updated payment status from PENDING to PROCESSING');
      }

      console.log('✅ Price confirmation email sent successfully for order:', orderId);
      console.log('📝', statusUpdateMessage);

      return NextResponse.json({
        success: true,
        message: `${emailSubject} sent successfully. ${statusUpdateMessage}`,
        eventId: result.eventId,
        previousStatus: currentPaymentStatus,
        newStatus: shouldUpdateStatus ? 'PROCESSING' : currentPaymentStatus
      });
    } else {
      console.error('❌ Failed to send payment confirmation email:', result.error);
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in send-confirmation-email API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}