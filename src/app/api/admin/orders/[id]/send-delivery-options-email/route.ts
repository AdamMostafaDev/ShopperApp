import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendDeliveryOptionsEmail } from '@/lib/klaviyo';
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

    // Get optional body parameters
    const body = await request.json().catch(() => ({}));
    const {
      warehouseLocation = 'Bangladesh Warehouse',
      packageWeight = 'To be calculated',
      arrivalDate = new Date().toLocaleDateString(),
      homeDeliveryEstimate = '2-3 business days',
      homeDeliveryFee = 150,
      pickupAvailableDate = 'Available now',
      pickupHours = '10:00 AM - 6:00 PM',
      pickupAddress = 'UniShopper Dhaka Office\n123 Main Street, Dhanmondi\nDhaka 1205, Bangladesh',
      supportPhone = '+880 1234567890',
      whatsappNumber = '+880 1234567890'
    } = body;

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

    // Get display amounts using the same logic as the frontend
    const amounts = getDisplayAmounts(order);

    // Prepare customer information
    const customerName = order.user
      ? `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim()
      : 'Customer';
    const customerEmail = order.user?.email || order.customerEmail;
    const customerPhone = order.user?.phone || order.customerPhone;

    // Prepare items data - handle both nested and flat structures
    const items = Array.isArray(order.items) ? order.items.map((item: any) => {
      // Log to see the structure
      console.log('🔍 Item structure:', JSON.stringify(item, null, 2));

      // Handle both nested product and flat item structure
      const title = item.product?.title || item.title || item.name || 'Product';
      const image = item.product?.image || item.image || item.imageUrl || '';
      const store = item.product?.store || item.store || item.storeName || 'Unknown Store';

      return {
        id: item.product?.id || item.id || 'unknown',
        title,
        price: item.price || 0,
        quantity: item.quantity || 1,
        image,
        url: item.product?.url || item.url || '',
        store,
        originalPriceValue: item.product?.originalPriceValue || item.originalPriceValue || 0
      };
    }) : [];

    console.log('📦 Prepared items for email:', items);

    // Prepare delivery options data
    const deliveryOptionsData = {
      orderId: order.id.toString(),
      orderNumber: order.orderNumber,
      customerEmail,
      customerName,
      customerPhone,
      deliveryAddress: order.shippingAddress,
      pickupAddress,
      items,
      packageWeight,
      warehouseLocation,
      arrivalDate,
      homeDeliveryEstimate,
      homeDeliveryFee,
      homeDeliveryUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://unishopper.com'}/orders/${order.id}/delivery`,
      pickupAvailableDate,
      pickupHours,
      pickupUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://unishopper.com'}/orders/${order.id}/pickup`,
      trackOrderUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://unishopper.com'}/orders/${order.orderNumber}`,
      supportPhone,
      whatsappNumber
    };

    console.log('📦 Sending delivery options for order:', orderId);
    console.log('📧 Email will be sent to:', customerEmail);
    console.log('📍 Warehouse location:', warehouseLocation);
    console.log('🚚 Home delivery fee:', homeDeliveryFee);
    console.log('🏪 Pickup location:', pickupAddress);

    // Send the delivery options email via Klaviyo
    const result = await sendDeliveryOptionsEmail(deliveryOptionsData);

    if (result.success) {
      // Only track that we sent the delivery options email
      // Don't change any status - we're waiting for customer's choice
      await prisma.order.update({
        where: { id: orderId },
        data: {
          notes: {
            ...((order.notes as any) || {}),
            deliveryOptionsEmailSent: new Date().toISOString(),
            deliveryOptionsPending: true,
            awaitingDeliveryChoice: true
          }
        }
      });

      console.log('✅ Delivery options email sent successfully for order:', orderId);
      console.log('⏳ Awaiting customer delivery choice (home delivery or pickup)');

      return NextResponse.json({
        success: true,
        message: 'Delivery options email sent successfully. Awaiting customer choice.',
        eventId: result.eventId
      });
    } else {
      console.error('❌ Failed to send delivery options email:', result.error);
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in send-delivery-options-email API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}