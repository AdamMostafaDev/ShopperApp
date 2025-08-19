import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import UserAgent from 'user-agents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SearchProduct = {
	id: string;
	title: string;
	price: number;
	originalPrice?: number;
	image: string;
	rating?: number;
	reviewCount?: number;
	url: string;
	store: 'amazon';
};

async function scrapeAmazonSearch(query: string): Promise<SearchProduct[]> {
	let browser: puppeteer.Browser | null = null;
	try {
		browser = await puppeteer.launch({
			headless: true,
			args: [
				'--no-sandbox',
				'--disable-setuid-sandbox',
				'--disable-dev-shm-usage',
				'--disable-gpu',
				'--window-size=1366,768'
			]
		});

		const page = await browser.newPage();
		await page.setViewport({ width: 1366, height: 768 });
		const ua = new UserAgent();
		await page.setUserAgent(ua.toString());
		await page.setExtraHTTPHeaders({
			'Accept-Language': 'en-US,en;q=0.9'
		});

		const url = `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
		await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
		await page.waitForSelector('[data-component-type="s-search-result"]', { timeout: 15000 }).catch(() => undefined);

		const products = await page.evaluate(() => {
			const cards = document.querySelectorAll('[data-component-type="s-search-result"]');
			const results: {
				id: string;
				title: string;
				price: number;
				originalPrice?: number;
				image: string;
				rating?: number;
				reviewCount?: number;
				url: string;
				store: 'amazon';
			}[] = [];

			cards.forEach((el, idx) => {
				const titleSpan = el.querySelector('h2 a span');
				const title = titleSpan?.textContent?.trim() || '';
				if (!title) return;

				const linkEl = el.querySelector('h2 a');
				const href = linkEl?.getAttribute('href') || '';
				const url = href.startsWith('http') ? href : `https://www.amazon.com${href}`;

				let price = 0;
				const priceOffscreen = el.querySelector('.a-price .a-offscreen')?.textContent || '';
				if (priceOffscreen) {
					const numeric = priceOffscreen.replace(/[^0-9.]/g, '');
					price = Number.parseFloat(numeric) || 0;
				}

				let originalPrice: number | undefined;
				const originalOffscreen = el.querySelector('.a-text-price .a-offscreen')?.textContent || '';
				if (originalOffscreen) {
					const numeric = originalOffscreen.replace(/[^0-9.]/g, '');
					const val = Number.parseFloat(numeric);
					if (!Number.isNaN(val) && val > price) originalPrice = val;
				}

				let image = '';
				const img = el.querySelector('img.s-image') as HTMLImageElement | null;
				if (img?.src) image = img.src;

				let rating: number | undefined;
				const ratingText = (el.querySelector('.a-icon-alt') as HTMLElement | null)?.innerText || '';
				const ratingMatch = ratingText.match(/([0-9.]+)/);
				if (ratingMatch) rating = Number.parseFloat(ratingMatch[1]);

				let reviewCount: number | undefined;
				const reviewsText = (el.querySelector('span[aria-label*="stars"] + span') as HTMLElement | null)?.innerText || '';
				const countMatch = reviewsText.replace(/[,\s]/g, '').match(/(\d+)/);
				if (countMatch) reviewCount = Number.parseInt(countMatch[1], 10);

				results.push({
					id: `amz-${Date.now()}-${idx}`,
					title,
					price,
					originalPrice,
					image,
					rating,
					reviewCount,
					url,
					store: 'amazon'
				});
			});

			return results;
		});

		return products;
	} finally {
		if (browser) {
			try { await browser.close(); } catch {}
		}
	}
}

export const GET = async (request: Request) => {
	try {
		const { searchParams } = new URL(request.url);
		const q = (searchParams.get('q') || '').trim();
		if (!q) {
			return NextResponse.json({ success: false, error: 'Missing query' }, { status: 400 });
		}

		const products = await scrapeAmazonSearch(q);
		return NextResponse.json({ success: true, products, query: q, totalResults: products.length });
	} catch (err) {
		return NextResponse.json({ success: false, error: 'Search failed' }, { status: 500 });
	}
};