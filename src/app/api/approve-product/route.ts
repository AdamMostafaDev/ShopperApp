import { NextRequest, NextResponse } from 'next/server';

interface ApproveProductRequest {
  productId: string;
  approved: boolean;
  userId?: string; // For user tracking
}

interface ProductApprovalResponse {
  success: boolean;
  product?: any;
  error?: string;
  message?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ProductApprovalResponse>> {
  try {
    const { productId, approved, userId }: ApproveProductRequest = await request.json();

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    if (approved === undefined) {
      return NextResponse.json(
        { success: false, error: 'Approval status is required' },
        { status: 400 }
      );
    }

    console.log(`📋 Processing approval for product ${productId}: ${approved ? 'APPROVED' : 'REJECTED'}`);

    if (approved) {
      // Product approved - can be added to cart
      console.log(`✅ Product ${productId} approved by ${userId || 'anonymous user'}`);

      // In a real implementation, you would:
      // 1. Mark the product as approved in database
      // 2. Update approval timestamp
      // 3. Add to user's cart or create cart item
      // 4. Send confirmation

      const approvedProduct = {
        id: productId,
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: userId,
        canAddToCart: true,
        requiresApproval: false
      };

      return NextResponse.json({
        success: true,
        product: approvedProduct,
        message: 'Product approved and ready to add to cart'
      });

    } else {
      // Product rejected
      console.log(`❌ Product ${productId} rejected by ${userId || 'anonymous user'}`);

      // In a real implementation, you would:
      // 1. Mark the product as rejected
      // 2. Log the rejection reason
      // 3. Optionally provide feedback for improvement

      const rejectedProduct = {
        id: productId,
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: userId,
        canAddToCart: false,
        requiresApproval: true
      };

      return NextResponse.json({
        success: true,
        product: rejectedProduct,
        message: 'Product rejected. You can edit the details and try again.'
      });
    }

  } catch (error) {
    console.error('Product approval error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check approval status
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('id');

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Checking approval status for product ${productId}`);

    // In a real implementation, you would retrieve from database
    // For now, return a sample response
    const approvalStatus = {
      id: productId,
      requiresApproval: true,
      status: 'pending', // 'pending' | 'approved' | 'rejected'
      canAddToCart: false,
      approvalHistory: [
        {
          action: 'created',
          timestamp: new Date().toISOString(),
          reason: 'Non-partner product requires approval'
        }
      ]
    };

    return NextResponse.json({
      success: true,
      approvalStatus
    });

  } catch (error) {
    console.error('Approval status check error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}