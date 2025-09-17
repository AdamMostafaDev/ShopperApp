import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = parseInt(id);

    if (isNaN(orderId)) {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      exchangeRate,
      finalProductCostBdt,
      finalServiceChargeBdt,
      finalShippingCostBdt,
      finalShippingOnlyBdt,
      finalShippingOnlyUsd,
      finalAdditionalFeesBdt,
      finalAdditionalFeesUsd,
      feeDescription,
      finalTaxBdt,
      finalTotalAmountBdt,
      finalProductCostUsd,
      finalServiceChargeUsd,
      finalShippingCostUsd,
      finalTaxUsd,
      finalTotalAmountUsd,
      finalItems,
    } = body;

    // Validate required fields
    if (
      !exchangeRate ||
      finalProductCostBdt === undefined ||
      finalServiceChargeBdt === undefined ||
      finalShippingCostBdt === undefined ||
      finalTaxBdt === undefined ||
      finalTotalAmountBdt === undefined
    ) {
      return NextResponse.json(
        { error: 'Missing required pricing fields' },
        { status: 400 }
      );
    }

    // Check if order exists
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Update the order with final pricing
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        exchangeRate: parseFloat(exchangeRate),
        finalPricingUpdated: true,
        finalProductCostBdt: parseFloat(finalProductCostBdt),
        finalServiceChargeBdt: parseFloat(finalServiceChargeBdt),
        finalShippingCostBdt: parseFloat(finalShippingCostBdt),
        finalShippingOnlyBdt: finalShippingOnlyBdt ? parseFloat(finalShippingOnlyBdt) : null,
        finalShippingOnlyUsd: finalShippingOnlyUsd ? parseFloat(finalShippingOnlyUsd) : null,
        finalAdditionalFeesBdt: finalAdditionalFeesBdt ? parseFloat(finalAdditionalFeesBdt) : null,
        finalAdditionalFeesUsd: finalAdditionalFeesUsd ? parseFloat(finalAdditionalFeesUsd) : null,
        feeDescription: feeDescription || null,
        finalTaxBdt: parseFloat(finalTaxBdt),
        finalTotalAmountBdt: parseFloat(finalTotalAmountBdt),
        finalProductCostUsd: parseFloat(finalProductCostUsd),
        finalServiceChargeUsd: parseFloat(finalServiceChargeUsd),
        finalShippingCostUsd: parseFloat(finalShippingCostUsd),
        finalTaxUsd: parseFloat(finalTaxUsd),
        finalTotalAmountUsd: parseFloat(finalTotalAmountUsd),
        finalItems: finalItems || null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Pricing updated successfully',
      order: updatedOrder,
    });

  } catch (error) {
    console.error('Update pricing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}