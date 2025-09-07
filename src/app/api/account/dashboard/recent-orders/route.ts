import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    
    // Get recent orders with related data
    const recentOrders = await prisma.order.findMany({
      where: { userId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        productCostBdt: true,
        items: true, // JSON field containing item data
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5, // Show last 5 orders
    });

    // Transform the data for frontend consumption
    const transformedOrders = recentOrders.map(order => {
      const items = Array.isArray(order.items) ? order.items : [];
      const displayItems = items.slice(0, 3); // Show first 3 items
      
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.productCostBdt,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        itemCount: items.length,
        items: displayItems.map((item: any, index: number) => ({
          id: `${order.id}-${index}`,
          quantity: item.quantity || 1,
          price: item.price || 0,
          product: {
            id: item.id || item.asin || `product-${index}`,
            name: item.name || item.title || 'Unknown Product',
            imageUrl: item.image || item.imageUrl || '/placeholder-image.png',
          },
        })),
        hasMoreItems: items.length > 3,
      };
    });

    return NextResponse.json({
      orders: transformedOrders,
      total: recentOrders.length,
    });
    
  } catch (error) {
    console.error('Recent orders error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}