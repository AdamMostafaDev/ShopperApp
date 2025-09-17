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
      switch (status) {
        case 'pending':
          whereClause.paymentConfirmationStatus = 'PENDING';
          break;
        case 'complete':
          whereClause.paymentConfirmationStatus = 'COMPLETE';
          break;
        case 'failed':
          whereClause.paymentConfirmationStatus = 'FAILED';
          break;
      }
    }

    if (search) {
      whereClause.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
        { stripePaymentIntentId: { contains: search, mode: 'insensitive' } },
        { user: {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } }
          ]
        }}
      ];
    }

    // Get orders with payment information
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
            email: true
          }
        }
      }
    });

    // Get total count for pagination
    const totalCount = await prisma.order.count({
      where: whereClause
    });

    // Format payments for display
    const formattedPayments = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customer: {
        name: order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Guest',
        email: order.user?.email || order.customerEmail
      },
      amount: {
        bdt: Number(order.totalAmountBdt),
        usd: Number(order.totalAmountUsd || 0),
        formattedBdt: `৳${Number(order.totalAmountBdt).toLocaleString()}`,
        formattedUsd: `$${Number(order.totalAmountUsd || 0).toFixed(2)}`
      },
      paymentStatus: order.paymentStatus,
      paymentConfirmationStatus: order.paymentConfirmationStatus,
      stripePaymentIntentId: order.stripePaymentIntentId || '',
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      formattedCreated: order.createdAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      paymentMethod: 'Stripe' // Default for now, can be enhanced later
    }));

    // Calculate summary statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const pendingConfirmation = await prisma.order.count({
      where: { paymentConfirmationStatus: 'PENDING' }
    });

    const confirmedToday = await prisma.order.count({
      where: {
        paymentConfirmationStatus: 'COMPLETE',
        updatedAt: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    const totalConfirmed = await prisma.order.count({
      where: { paymentConfirmationStatus: 'COMPLETE' }
    });

    const totalAmountData = await prisma.order.aggregate({
      _sum: {
        totalAmountBdt: true
      },
      where: {
        paymentConfirmationStatus: 'COMPLETE',
        status: {
          not: 'CANCELLED'
        }
      }
    });

    const totalAmount = Number(totalAmountData._sum.totalAmountBdt || 0);

    const summary = {
      pendingConfirmation,
      confirmedToday,
      totalConfirmed,
      totalAmount: Math.round(totalAmount),
      formattedTotalAmount: `৳${Math.round(totalAmount).toLocaleString()}`
    };

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: {
        payments: formattedPayments,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        summary
      }
    });

  } catch (error) {
    console.error('Admin payments error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payments' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}