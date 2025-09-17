import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');

    const skip = (page - 1) * limit;

    // Build where clause
    let whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get customers with pagination
    const customers = await prisma.user.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        orders: {
          select: {
            id: true,
            totalAmountBdt: true,
            status: true,
            createdAt: true
          },
          where: {
            status: {
              not: 'CANCELLED'
            }
          }
        }
      }
    });

    // Get total count for pagination
    const totalCount = await prisma.user.count({
      where: whereClause
    });

    // Format customers with order statistics
    const formattedCustomers = customers.map(customer => {
      const validOrders = customer.orders.filter(order => order.status !== 'CANCELLED');
      const totalSpent = validOrders.reduce((sum, order) => sum + Number(order.totalAmountBdt), 0);
      const lastOrder = validOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      return {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
        formattedCreated: customer.createdAt.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        orderStats: {
          totalOrders: validOrders.length,
          totalSpent: Math.round(totalSpent),
          formattedTotalSpent: `৳${Math.round(totalSpent).toLocaleString()}`,
          lastOrderDate: lastOrder?.createdAt || null,
          formattedLastOrderDate: lastOrder
            ? lastOrder.createdAt.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })
            : null
        },
        status: validOrders.length > 0 ? 'ACTIVE' : 'INACTIVE'
      };
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: {
        customers: formattedCustomers,
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
    console.error('Admin customers error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customers' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}