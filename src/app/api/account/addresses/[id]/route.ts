import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateAddressSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  street1: z.string().min(1, 'Street address is required'),
  street2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().optional(),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
  phone: z.string().min(1, 'Phone number is required'),
});

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authConfig);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const addressId = parseInt(params.id);
    
    if (isNaN(addressId)) {
      return NextResponse.json(
        { error: 'Invalid address ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updateAddressSchema.parse(body);

    // Check if address belongs to user
    const existingAddress = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!existingAddress || existingAddress.userId !== userId) {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      );
    }

    // Update address
    const updatedAddress = await prisma.address.update({
      where: { id: addressId },
      data: {
        ...validatedData,
        street2: validatedData.street2 || null,
        state: validatedData.state || null,
      },
    });

    return NextResponse.json({
      success: true,
      address: updatedAddress
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Address update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authConfig);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const addressId = parseInt(params.id);
    
    if (isNaN(addressId)) {
      return NextResponse.json(
        { error: 'Invalid address ID' },
        { status: 400 }
      );
    }

    // Check if address belongs to user
    const existingAddress = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!existingAddress || existingAddress.userId !== userId) {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      );
    }

    // Don't allow deleting the only address if it's default
    const userAddresses = await prisma.address.findMany({
      where: { userId },
    });

    if (existingAddress.isDefault && userAddresses.length === 1) {
      return NextResponse.json(
        { error: 'Cannot delete the only default address' },
        { status: 400 }
      );
    }

    // Delete address
    await prisma.address.delete({
      where: { id: addressId },
    });

    return NextResponse.json({
      success: true,
      message: 'Address deleted successfully'
    });
    
  } catch (error) {
    console.error('Address delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}