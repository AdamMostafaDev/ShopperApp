import { NextRequest, NextResponse } from 'next/server';
import { validatePrice } from '@/lib/currency';

interface UpdateProductRequest {
  productId: string;
  updates: {
    title?: string;
    price?: number;
    originalCurrency?: string;
    originalPriceValue?: number;
    image?: string;
    url?: string;
  };
}

interface ProductUpdateResponse {
  success: boolean;
  product?: any;
  error?: string;
  validationErrors?: string[];
}

export async function PUT(request: NextRequest): Promise<NextResponse<ProductUpdateResponse>> {
  try {
    const { productId, updates }: UpdateProductRequest = await request.json();

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No updates provided' },
        { status: 400 }
      );
    }

    const validationErrors: string[] = [];

    // Validate title
    if (updates.title !== undefined) {
      if (!updates.title || updates.title.trim().length < 3) {
        validationErrors.push('Title must be at least 3 characters long');
      } else if (updates.title.length > 200) {
        validationErrors.push('Title must be less than 200 characters');
      }
    }

    // Validate price
    if (updates.originalPriceValue !== undefined) {
      if (updates.originalPriceValue < 0) {
        validationErrors.push('Price cannot be negative');
      } else if (updates.originalPriceValue > 0) {
        const currency = updates.originalCurrency || 'USD';
        const priceValidation = validatePrice(updates.originalPriceValue, currency);
        if (!priceValidation.isValid) {
          validationErrors.push(`Price validation failed: ${priceValidation.reason}`);
        }
      }
    }

    // Validate URL
    if (updates.url !== undefined) {
      try {
        new URL(updates.url);
      } catch (e) {
        validationErrors.push('Invalid URL format');
      }
    }

    // Validate image URL
    if (updates.image !== undefined && updates.image) {
      if (!updates.image.startsWith('/assets/') && !updates.image.startsWith('http')) {
        validationErrors.push('Image must be a valid URL or local asset path');
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          validationErrors
        },
        { status: 400 }
      );
    }

    // In a real implementation, you would:
    // 1. Retrieve the original product from database/cache
    // 2. Apply the updates
    // 3. Recalculate derived fields (like BDT price conversion)
    // 4. Save the updated product

    // For now, we'll simulate this process
    console.log(`📝 Updating product ${productId} with:`, updates);

    // Simulate currency conversion if price was updated
    let convertedPrice = updates.price;
    if (updates.originalPriceValue && updates.originalPriceValue > 0) {
      // In reality, you'd call convertToBdt here
      // For simulation, assuming 1 USD = 120 BDT
      const exchangeRates = {
        'USD': 120,
        'GBP': 150,
        'EUR': 130,
        'CAD': 90,
        'AUD': 80
      };
      const currency = updates.originalCurrency || 'USD';
      const rate = exchangeRates[currency as keyof typeof exchangeRates] || 120;
      convertedPrice = Math.round(updates.originalPriceValue * rate * 100) / 100;
    }

    const updatedProduct = {
      id: productId,
      title: updates.title,
      price: convertedPrice,
      originalPriceValue: updates.originalPriceValue,
      originalCurrency: updates.originalCurrency,
      image: updates.image,
      url: updates.url,
      lastUpdated: new Date().toISOString(),
      requiresApproval: true, // Updated products still need approval
      isEditable: true
    };

    console.log(`✅ Product ${productId} updated successfully`);

    return NextResponse.json({
      success: true,
      product: updatedProduct
    });

  } catch (error) {
    console.error('Product update error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve product details for editing
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

    // In a real implementation, you would retrieve from database/cache
    // For now, return a sample response
    console.log(`📖 Retrieving product details for ${productId}`);

    const sampleProduct = {
      id: productId,
      title: 'Sample Product Title',
      price: 2400, // BDT
      originalPriceValue: 20, // USD
      originalCurrency: 'USD',
      image: '/assets/images/generic-product.svg',
      url: 'https://example.com/product',
      requiresApproval: true,
      isEditable: true,
      extractionStatus: 'partial',
      missingFields: ['price'],
      extractionDetails: {
        titleConfidence: 0.8,
        priceConfidence: 0,
        imageConfidence: 0.2
      }
    };

    return NextResponse.json({
      success: true,
      product: sampleProduct
    });

  } catch (error) {
    console.error('Product retrieval error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}