import { NextResponse } from 'next/server';
import { detectStore } from '@/lib/product-capture';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SearchProduct = {
	id: string;
	title: string;
	price: number;
	originalPrice?: number;
	originalCurrency?: string;
	originalPriceValue?: number;
	weight?: number;
	image: string;
	rating?: number;
	reviewCount?: number;
	url: string;
	store: 'amazon' | 'walmart' | 'ebay';
	description?: string;
	features?: string[];
	availability: 'in_stock' | 'out_of_stock' | 'limited';
};

function isProductUrl(query: string): boolean {
	try {
		const url = new URL(query.startsWith('http') ? query : `https://${query}`);
		const hostname = url.hostname.toLowerCase();
		
		// Check if it's a product URL from supported stores
		if (hostname.includes('amazon.') && (url.pathname.includes('/dp/') || url.pathname.includes('/gp/product/'))) {
			return true;
		}
		if (hostname.includes('walmart.') && url.pathname.includes('/ip/')) {
			return true;
		}
		if (hostname.includes('ebay.') && url.pathname.includes('/itm/')) {
			return true;
		}
		
		return false;
	} catch {
		return false;
	}
}

async function captureProductFromUrl(url: string): Promise<SearchProduct | null> {
	try {
		// Clean and validate URL
		const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
		const store = detectStore(cleanUrl);
		
		if (!store) {
			throw new Error('Unsupported store');
		}

		// Call the capture-product API
		const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
		const response = await fetch(`${baseUrl}/api/capture-product`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ url: cleanUrl }),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || 'Failed to capture product');
		}

		const result = await response.json();
		
		if (!result.success || !result.product) {
			throw new Error(result.error || 'No product data returned');
		}

		const product = result.product;
		return {
			id: product.id,
			title: product.title,
			price: product.price,
			originalPrice: product.originalPrice,
			originalCurrency: product.originalCurrency,
			originalPriceValue: product.originalPriceValue,
			weight: product.weight,
			image: product.image,
			rating: product.rating,
			reviewCount: product.reviewCount,
			url: product.url,
			store: product.store,
			description: product.description,
			features: product.features,
			availability: product.availability
		};

	} catch (error) {
		console.error('Error capturing product from URL:', error);
		return null;
	}
}

export const GET = async (request: Request) => {
	try {
		const { searchParams } = new URL(request.url);
		const q = (searchParams.get('q') || '').trim();
		if (!q) {
			return NextResponse.json({ success: false, error: 'Missing query' }, { status: 400 });
		}

		// Check if the query is a product URL
		if (isProductUrl(q)) {
			console.log('🔗 Detected product URL, using ScraperAPI...');
			const product = await captureProductFromUrl(q);
			
			if (product) {
				return NextResponse.json({ 
					success: true, 
					products: [product], 
					query: q, 
					totalResults: 1,
					isDirectCapture: true 
				});
			} else {
				return NextResponse.json({ 
					success: false, 
					error: 'Failed to capture product from URL. Please check the URL and try again.' 
				}, { status: 500 });
			}
		}

		// For text-based searches, return empty results with suggestion to paste product URLs
		return NextResponse.json({ 
			success: true, 
			products: [], 
			query: q, 
			totalResults: 0,
			message: 'To get accurate product information with correct pricing, please paste a direct product URL from Amazon, Walmart, or eBay instead of searching with keywords.'
		});

	} catch (err) {
		console.error('Search API error:', err);
		return NextResponse.json({ success: false, error: 'Search failed' }, { status: 500 });
	}
};