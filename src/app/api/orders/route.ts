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
        shippingCostBdt: true,
        serviceChargeBdt: true,
        totalAmountBdt: true,
        status: true,
        paymentStatus: true,
        fulfillmentStatus: true,
        customerEmail: true,
        createdAt: true,
        updatedAt: true,
        refundDeadline: true,
      },
    });

    return NextResponse.json({
      orders: orders,
      count: orders.length,
    });

  } catch (error) {
    console.error('Orders API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}