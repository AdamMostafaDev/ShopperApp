import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const skip = (page - 1) * limit;

    // Build where clause
    let whereClause: any = {};

    if (status && status !== 'all') {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
        { user: {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } }
          ]
        }}
      ];
    }

    // Get orders with pagination
    const orders = await prisma.order.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
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

    // Get total count for pagination
    const totalCount = await prisma.order.count({
      where: whereClause
    });

    // Format orders for display with full product details
    const formattedOrders = orders.map(order => {
      const items = Array.isArray(order.items) ? order.items : [];

      // Parse and format items with product details
      const formattedItems = items.map((item: any) => ({
        id: item.product?.id || 'unknown',
        title: item.product?.title || 'Unknown Product',
        price: item.product?.price || 0,
        quantity: item.quantity || 1,
        image: item.product?.image || '',
        store: item.product?.store || 'unknown',
        url: item.product?.url || '',
        weight: item.product?.weight || 0,
        originalPriceValue: item.product?.originalPriceValue || 0,
        originalCurrency: item.product?.originalCurrency || 'USD'
      }));

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customer: {
          name: order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Guest',
          email: order.user?.email || order.customerEmail,
          phone: order.user?.phone || order.customerPhone
        },
        status: order.status,
        fulfillmentStatus: order.fulfillmentStatus,
        paymentStatus: order.paymentStatus,

        // International shipping workflow statuses
        workflow: {
          orderPlaced: order.orderPlacedStatus,
          paymentConfirmation: order.paymentConfirmationStatus,
          shipped: order.shippedStatus,
          outForDelivery: order.outForDeliveryStatus,
          delivered: order.deliveredStatus
        },

        amounts: {
          totalBdt: Number(order.totalAmountBdt),
          totalUsd: Number(order.totalAmountUsd || 0),
          formattedBdt: `৳${Number(order.totalAmountBdt).toLocaleString()}`,
          formattedUsd: `$${Number(order.totalAmountUsd || 0).toFixed(2)}`
        },

        items: formattedItems,
        itemCount: items.length,
        weight: Number(order.totalWeight),

        dates: {
          created: order.createdAt,
          updated: order.updatedAt,
          formattedCreated: order.createdAt.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        },

        shippingAddress: order.shippingAddress,
        stripePaymentIntentId: order.stripePaymentIntentId,
        exchangeRate: Number(order.exchangeRate || 0),

        // Original pricing fields
        productCostBdt: Number(order.productCostBdt || 0),
        productCostUsd: Number(order.productCostUsd || 0),
        serviceChargeBdt: Number(order.serviceChargeBdt || 0),
        serviceChargeUsd: Number(order.serviceChargeUsd || 0),
        shippingCostBdt: Number(order.shippingCostBdt || 0),
        shippingCostUsd: Number(order.shippingCostUsd || 0),
        taxBdt: Number(order.taxBdt || 0),
        taxUsd: Number(order.taxUsd || 0),
        totalAmountBdt: Number(order.totalAmountBdt || 0),
        totalAmountUsd: Number(order.totalAmountUsd || 0),

        // Final pricing fields (after admin update)
        finalPricingUpdated: order.finalPricingUpdated || false,
        finalProductCostBdt: order.finalProductCostBdt ? Number(order.finalProductCostBdt) : null,
        finalProductCostUsd: order.finalProductCostUsd ? Number(order.finalProductCostUsd) : null,
        finalServiceChargeBdt: order.finalServiceChargeBdt ? Number(order.finalServiceChargeBdt) : null,
        finalServiceChargeUsd: order.finalServiceChargeUsd ? Number(order.finalServiceChargeUsd) : null,
        finalShippingCostBdt: order.finalShippingCostBdt ? Number(order.finalShippingCostBdt) : null,
        finalShippingCostUsd: order.finalShippingCostUsd ? Number(order.finalShippingCostUsd) : null,
        finalShippingOnlyBdt: order.finalShippingOnlyBdt ? Number(order.finalShippingOnlyBdt) : null,
        finalShippingOnlyUsd: order.finalShippingOnlyUsd ? Number(order.finalShippingOnlyUsd) : null,
        finalAdditionalFeesBdt: order.finalAdditionalFeesBdt ? Number(order.finalAdditionalFeesBdt) : null,
        finalAdditionalFeesUsd: order.finalAdditionalFeesUsd ? Number(order.finalAdditionalFeesUsd) : null,
        feeDescription: order.feeDescription || null,
        finalTaxBdt: order.finalTaxBdt ? Number(order.finalTaxBdt) : null,
        finalTaxUsd: order.finalTaxUsd ? Number(order.finalTaxUsd) : null,
        finalTotalAmountBdt: order.finalTotalAmountBdt ? Number(order.finalTotalAmountBdt) : null,
        finalTotalAmountUsd: order.finalTotalAmountUsd ? Number(order.finalTotalAmountUsd) : null,
        finalItems: order.finalItems || null,
      };
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: {
        orders: formattedOrders,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Admin orders error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}