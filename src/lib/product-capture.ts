import { Product } from '@/types';

export interface ProductCaptureResult {
  success: boolean;
  product?: Product;
  error?: string;
}

export function extractProductIdFromUrl(url: string): string | null {
  try {
    // Amazon URL patterns
    const amazonPatterns = [
      /\/dp\/([A-Z0-9]{10})/,
      /\/gp\/product\/([A-Z0-9]{10})/,
      /\/product\/([A-Z0-9]{10})/,
      /\/([A-Z0-9]{10})(?:[/?]|$)/
    ];

    for (const pattern of amazonPatterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  } catch (error) {
    console.error('Error extracting product ID:', error);
    return null;
  }
}

export function detectStore(url: string): 'amazon' | 'walmart' | 'ebay' | null {
  const hostname = new URL(url).hostname.toLowerCase();
  
  if (hostname.includes('amazon.')) {
    return 'amazon';
  } else if (hostname.includes('walmart.')) {
    return 'walmart';
  } else if (hostname.includes('ebay.')) {
    return 'ebay';
  }
  
  return null;
}

export function isAmazonLink(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.includes('amazon.');
  } catch {
    return false;
  }
}

export async function captureProductFromUrl(url: string): Promise<ProductCaptureResult> {
  try {
    const store = detectStore(url);
    
    if (!store) {
      return {
        success: false,
        error: 'This link is not supported as of yet. Please reach out to contact for assistance.'
      };
    }

    // Only allow Amazon for now
    if (store !== 'amazon') {
      return {
        success: false,
        error: 'This link is not supported as of yet. Please reach out to contact for assistance.'
      };
    }

    // Use the real web scraping API
    const response = await fetch('/api/capture-product', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || 'Failed to capture product. Please try again.'
      };
    }

    const result = await response.json();
    
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to capture product. Please try again.'
      };
    }

    // Transform the scraped product to match our Product interface
    const scrapedProduct = result.product;
    console.log('🔄 Transforming scraped product, weight:', scrapedProduct.weight, 'kg');
    const product: Product = {
      id: scrapedProduct.id,
      title: scrapedProduct.title,
      price: scrapedProduct.price,
      originalPrice: scrapedProduct.originalPrice,
      originalCurrency: scrapedProduct.originalCurrency,
      originalPriceValue: scrapedProduct.originalPriceValue,
      weight: scrapedProduct.weight, // Include weight field!
      image: scrapedProduct.image || '/api/placeholder/300/300',
      rating: scrapedProduct.rating || 0,
      reviewCount: scrapedProduct.reviewCount || 0,
      url: scrapedProduct.url,
      store: scrapedProduct.store,
      description: scrapedProduct.description || 'Product captured from ' + store,
      features: scrapedProduct.features,
      availability: scrapedProduct.availability
    };
    console.log('✅ Transformed product, weight:', product.weight, 'kg');

    return {
      success: true,
      product: product
    };

  } catch (error) {
    console.error('Error capturing product:', error);
    return {
      success: false,
      error: 'Failed to capture product. Please check the URL and try again.'
    };
  }
}

// Real implementation would use something like this:
/*
export async function captureProductFromUrlReal(url: string): Promise<ProductCaptureResult> {
  try {
    const store = detectStore(url);
    
    if (!store) {
      return {
        success: false,
        error: 'Unsupported store. Please use Amazon, Walmart, or eBay links.'
      };
    }

    // Use a web scraping service or API
    const response = await fetch('/api/capture-product', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, store }),
    });

    if (!response.ok) {
      throw new Error('Failed to capture product');
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Error capturing product:', error);
    return {
      success: false,
      error: 'Failed to capture product. Please check the URL and try again.'
    };
  }
}
*/
