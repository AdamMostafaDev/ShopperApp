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

    // Get user stats in parallel
    const [orderStats, profileCompletion] = await Promise.all([
      // Order statistics
      prisma.order.aggregate({
        where: { userId },
        _count: { id: true },
        _sum: { productCostBdt: true },
      }),
      
      // Profile completion check
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          addresses: {
            select: { id: true },
            take: 1,
          },
        },
      }),
    ]);

    // Calculate profile completion percentage
    let profileCompletionPercentage = 0;
    if (profileCompletion) {
      const completedFields = [
        profileCompletion.firstName,
        profileCompletion.lastName,
        profileCompletion.email,
        profileCompletion.addresses.length > 0,
      ].filter(Boolean).length;
      
      profileCompletionPercentage = Math.round((completedFields / 4) * 100);
    }

    // Get recent order statuses
    const recentOrdersStatus = await prisma.order.findMany({
      where: { userId },
      select: {
        status: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const statusCounts = recentOrdersStatus.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const stats = {
      orders: {
        total: orderStats._count.id || 0,
        totalSpent: orderStats._sum.productCostBdt || 0,
        statusBreakdown: statusCounts,
      },
      profile: {
        completionPercentage: profileCompletionPercentage,
      },
      activity: {
        hasOrders: (orderStats._count.id || 0) > 0,
        hasAddresses: profileCompletion?.addresses.length > 0,
      },
    };

    return NextResponse.json(stats);
    
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}