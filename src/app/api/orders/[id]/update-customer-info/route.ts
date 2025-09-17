import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { sendOrderConfirmationEmail } from '@/lib/klaviyo';

const prisma = new PrismaClient();

export async function POST(
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

    const { id } = await params;
    const orderId = parseInt(id);
    if (isNaN(orderId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid order ID' },
        { status: 400 }
      );
    }

    const { paymentIntentId, shippingAddress } = await request.json();

    // Extract phone from shipping address if available
    const customerPhone = shippingAddress?.phone || null;

    // Update order with customer information from Stripe
    const updatedOrder = await prisma.order.update({
      where: {
        id: orderId,
        userId: parseInt(session.user.id), // Ensure user owns this order
      },
      data: {
        stripePaymentIntentId: paymentIntentId,
        shippingAddress: shippingAddress,
        customerPhone: customerPhone,
        paymentStatus: 'PENDING', // Payment is pending confirmation
        orderPlacedStatus: 'COMPLETE', // Order is placed
        paymentConfirmationStatus: 'PENDING', // Payment confirmation happens later
      },
    });

    console.log(`✅ Order ${orderId} updated with customer info and payment success`);

    // Send order confirmation email via Klaviyo
    try {
      const items = Array.isArray(updatedOrder.items) ? updatedOrder.items : [];
      const customerName = `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim() || 'Customer';
      
      console.log('🔍 UPDATE-CUSTOMER-INFO EMAIL DEBUG:');
      console.log('- updatedOrder.customerEmail:', updatedOrder.customerEmail);
      console.log('- session.user.email:', session.user.email);
      console.log('- customerName:', customerName);
      console.log('- orderId:', updatedOrder.id);
      console.log('- orderNumber:', updatedOrder.orderNumber);
      console.log('🔍 CUSTOMER INFO DEBUG:');
      console.log('- updatedOrder.customerPhone:', updatedOrder.customerPhone);
      console.log('- updatedOrder.shippingAddress:', JSON.stringify(updatedOrder.shippingAddress, null, 2));
      console.log('🔍 RAW ITEMS FROM DATABASE:', JSON.stringify(updatedOrder.items, null, 2));
      
      // Fix incomplete product data by ensuring we have all required fields
      const completeItems = items.map((item: any) => ({
        id: item.id || item.product?.id || 'unknown',
        title: item.title || item.product?.title || 'Product',
        price: item.price || item.product?.price || 0,
        originalPriceValue: item.originalPriceValue || item.product?.originalPriceValue || null,
        quantity: item.quantity || 1,
        image: item.image || item.product?.image || '/api/placeholder/300/300',
        url: item.url || item.product?.url || '#',
        store: item.store || item.product?.store || 'amazon'
      }));

      console.log('🔍 COMPLETE ITEMS FOR EMAIL:', JSON.stringify(completeItems, null, 2));

      const emailResult = await sendOrderConfirmationEmail({
        orderId: updatedOrder.id.toString(),
        orderNumber: updatedOrder.orderNumber,
        customerEmail: updatedOrder.customerEmail,
        customerName: customerName,
        customerPhone: updatedOrder.customerPhone,
        shippingAddress: updatedOrder.shippingAddress,
        items: completeItems,
        subtotalBdt: Number(updatedOrder.productCostBdt),
        serviceChargeBdt: Number(updatedOrder.serviceChargeBdt),
        taxBdt: Number(updatedOrder.taxBdt),
        totalAmountBdt: Number(updatedOrder.totalAmountBdt),
        subtotalUsd: Number(updatedOrder.productCostUsd || 0),
        serviceChargeUsd: Number(updatedOrder.serviceChargeUsd || 0),
        taxUsd: Number(updatedOrder.taxUsd || 0),
        totalAmountUsd: Number(updatedOrder.totalAmountUsd || 0),
        exchangeRate: Number(updatedOrder.exchangeRate || 121.5),
        currency: updatedOrder.currency || 'BDT',
        orderDate: updatedOrder.createdAt.toISOString()
      });

      if (emailResult.success) {
        console.log('✅ Order confirmation email sent successfully');
      } else {
        console.error('⚠️ Failed to send order confirmation email:', emailResult.error);
      }
    } catch (emailError) {
      console.error('⚠️ Error sending order confirmation email:', emailError);
      // Don't fail the order update if email fails
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder
    });

  } catch (error) {
    console.error('Update customer info error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update customer information' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}