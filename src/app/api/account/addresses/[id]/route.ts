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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authConfig);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const { id } = await params;
    const addressId = parseInt(id);
    
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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authConfig);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const { id } = await params;
    const addressId = parseInt(id);
    
    if (isNaN(addressId)) {
      return NextResponse.json(
        { error: 'Invalid address ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'set-default') {
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

      // Use transaction to ensure atomicity
      await prisma.$transaction(async (tx) => {
        // First, set all user's addresses to non-default
        await tx.address.updateMany({
          where: { userId },
          data: { isDefault: false },
        });

        // Then set the specified address as default
        await tx.address.update({
          where: { id: addressId },
          data: { isDefault: true },
        });
      });

      // Fetch all updated addresses to return in correct order
      const updatedAddresses = await prisma.address.findMany({
        where: { userId },
        orderBy: [
          { id: 'desc' }  // Keep original order by creation
        ]
      });

      return NextResponse.json({
        success: true,
        addresses: updatedAddresses,
        message: 'Default address updated successfully'
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Address patch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authConfig);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const { id } = await params;
    const addressId = parseInt(id);
    
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

    // Get all user addresses before deletion
    const userAddresses = await prisma.address.findMany({
      where: { userId },
      orderBy: { id: 'desc' } // Most recent first
    });

    if (userAddresses.length === 1) {
      return NextResponse.json(
        { error: 'Cannot delete the only address' },
        { status: 400 }
      );
    }

    // Use transaction to handle deletion and potential default reassignment
    await prisma.$transaction(async (tx) => {
      // Delete the address
      await tx.address.delete({
        where: { id: addressId },
      });

      // If we deleted the default address, set another address as default
      if (existingAddress.isDefault) {
        // Find the most recent remaining address to make default
        const remainingAddress = userAddresses.find(addr => addr.id !== addressId);
        
        if (remainingAddress) {
          await tx.address.update({
            where: { id: remainingAddress.id },
            data: { isDefault: true }
          });
        }
      }
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