import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id); // Convert string to int
    
    const orders = await prisma.order.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        orderNumber: true,
        items: true,
        productCostBdt: true,
        serviceChargeBdt: true,
        shippingCostBdt: true,
        taxBdt: true,
        totalAmountBdt: true,
        status: true,
        paymentStatus: true,
        fulfillmentStatus: true,
        customerEmail: true,
        createdAt: true,
        updatedAt: true,
        refundDeadline: true,
        exchangeRate: true,
        finalPricingUpdated: true,
        finalProductCostBdt: true,
        finalServiceChargeBdt: true,
        finalShippingCostBdt: true,
        finalShippingOnlyBdt: true,
        finalAdditionalFeesBdt: true,
        feeDescription: true,
        finalTaxBdt: true,
        finalTotalAmountBdt: true,
        finalItems: true,
      },
    });

    // Convert Decimal fields to numbers for JSON serialization
    const mappedOrders = orders.map(order => ({
      ...order,
      productCostBdt: Number(order.productCostBdt || 0),
      serviceChargeBdt: Number(order.serviceChargeBdt || 0),
      shippingCostBdt: Number(order.shippingCostBdt || 0),
      taxBdt: Number(order.taxBdt || 0),
      totalAmountBdt: Number(order.totalAmountBdt || 0),
      exchangeRate: Number(order.exchangeRate || 121.5),
      finalProductCostBdt: order.finalProductCostBdt ? Number(order.finalProductCostBdt) : null,
      finalServiceChargeBdt: order.finalServiceChargeBdt ? Number(order.finalServiceChargeBdt) : null,
      finalShippingCostBdt: order.finalShippingCostBdt ? Number(order.finalShippingCostBdt) : null,
      finalShippingOnlyBdt: order.finalShippingOnlyBdt ? Number(order.finalShippingOnlyBdt) : null,
      finalAdditionalFeesBdt: order.finalAdditionalFeesBdt ? Number(order.finalAdditionalFeesBdt) : null,
      feeDescription: order.feeDescription || null,
      finalTaxBdt: order.finalTaxBdt ? Number(order.finalTaxBdt) : null,
      finalTotalAmountBdt: order.finalTotalAmountBdt ? Number(order.finalTotalAmountBdt) : null,
    }));

    return NextResponse.json({
      orders: mappedOrders,
      count: mappedOrders.length,
    });

  } catch (error) {
    console.error('Orders API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}