import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Temporary test endpoint to manually update shipping address
export async function POST(request: Request) {
  try {
    const { orderId, shippingAddress, customerPhone } = await request.json();
    
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        shippingAddress: shippingAddress,
        customerPhone: customerPhone,
        paymentStatus: 'PAID',
        status: 'PROCESSING'
      }
    });
    
    return NextResponse.json({ success: true, updated });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}