import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get total orders count
    const totalOrders = await prisma.order.count();

    // Get total unique customers count
    const totalCustomers = await prisma.user.count();

    // Calculate total revenue (sum of all non-cancelled orders)
    const revenueData = await prisma.order.aggregate({
      _sum: {
        totalAmountBdt: true,
      },
      where: {
        status: {
          not: 'CANCELLED'
        }
      }
    });

    const totalRevenue = revenueData._sum.totalAmountBdt || 0;

    // Get orders by status breakdown
    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });

    // Get orders by tracking status
    const pendingPayment = await prisma.order.count({
      where: { paymentConfirmationStatus: 'PENDING' }
    });

    const pendingShipment = await prisma.order.count({
      where: {
        paymentConfirmationStatus: 'COMPLETE',
        shippedStatus: 'PENDING'
      }
    });

    const inTransit = await prisma.order.count({
      where: {
        shippedStatus: 'PROCESSING',
        deliveredStatus: 'PENDING'
      }
    });

    const delivered = await prisma.order.count({
      where: { deliveredStatus: 'COMPLETE' }
    });

    // Get recent orders activity
    const recentActivity = await prisma.order.findMany({
      take: 5,
      orderBy: { updatedAt: 'desc' },
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

    // This month stats
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const ordersThisMonth = await prisma.order.count({
      where: {
        createdAt: {
          gte: currentMonth
        }
      }
    });

    const revenueThisMonth = await prisma.order.aggregate({
      _sum: {
        totalAmountBdt: true,
      },
      where: {
        createdAt: {
          gte: currentMonth
        },
        status: {
          not: 'CANCELLED'
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalOrders,
          totalCustomers,
          totalRevenue: Math.round(Number(totalRevenue)),
          ordersThisMonth,
          monthlyRevenue: Math.round(Number(revenueThisMonth._sum.totalAmountBdt || 0))
        },
        orderStatus: {
          pending: ordersByStatus.find(s => s.status === 'PENDING')?._count.status || 0,
          processing: ordersByStatus.find(s => s.status === 'PROCESSING')?._count.status || 0,
          shipped: ordersByStatus.find(s => s.status === 'SHIPPED')?._count.status || 0,
          delivered: ordersByStatus.find(s => s.status === 'DELIVERED')?._count.status || 0,
          cancelled: ordersByStatus.find(s => s.status === 'CANCELLED')?._count.status || 0
        },
        workflow: {
          pendingPayment,
          pendingShipment,
          inTransit,
          delivered
        },
        recentActivity: recentActivity.map(order => ({
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Guest',
          status: order.status,
          amount: Number(order.totalAmountBdt),
          updatedAt: order.updatedAt,
          formattedDate: order.updatedAt.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        }))
      }
    });

  } catch (error) {
    console.error('Admin dashboard stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}