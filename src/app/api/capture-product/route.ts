import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import UserAgent from 'user-agents';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { parsePriceFromScrapedText, convertToBdt, detectCurrency, isBdtPrice } from '@/lib/currency';

interface ScrapedProduct {
  title: string;
  price: number; // BDT converted price
  originalPrice?: number; // BDT converted original price
  originalCurrency?: string; // USD, CAD, GBP, AUD
  originalPriceValue?: number; // Original price before conversion
  weight?: number; // Weight in kg for shipping calculation
  image: string;
  rating?: number;
  reviewCount?: number;
  description?: string;
  features?: string[];
  availability: 'in_stock' | 'out_of_stock' | 'limited';
  store: 'amazon' | 'walmart' | 'ebay';
}

function detectStore(url: string): 'amazon' | 'walmart' | 'ebay' | null {
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

async function scrapeAmazonWithScraperAPI(url: string): Promise<ScrapedProduct | null> {
  try {
    const apiKey = process.env.SCRAPER_API_KEY;
    if (!apiKey) {
      throw new Error('ScraperAPI key not configured');
    }

    // Extract ASIN from Amazon URL
    const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/);
    if (!asinMatch) {
      throw new Error('Could not extract ASIN from Amazon URL');
    }
    
    const asin = asinMatch[1];
    console.log(`Using ScraperAPI for ASIN: ${asin}`);

    // Use ScraperAPI's structured Amazon product endpoint
    const scraperUrl = `https://api.scraperapi.com/structured/amazon/product?api_key=${apiKey}&asin=${asin}`;
    
    const response = await fetch(scraperUrl);
    
    if (!response.ok) {
      throw new Error(`ScraperAPI request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    
    if (!data || !data.name) {
      throw new Error('No product data returned from ScraperAPI');
    }

    // Parse original prices and detect currency
    const originalPriceValue = data.pricing ? parsePriceFromScrapedText(data.pricing) : 0;
    const originalListPrice = data.list_price ? parsePriceFromScrapedText(data.list_price) : undefined;
    const currency = detectCurrency(data.pricing || '');
    
    // Only convert if not already in BDT (save API costs!)
    let bdtPrice: number;
    let bdtOriginalPrice: number | undefined;
    
    if (currency === 'BDT') {
      console.log('💰 Price already in BDT, skipping conversion');
      bdtPrice = originalPriceValue;
      bdtOriginalPrice = originalListPrice;
    } else {
      console.log(`💱 Converting ${currency} to BDT`);
      bdtPrice = await convertToBdt(originalPriceValue, currency);
      bdtOriginalPrice = originalListPrice ? await convertToBdt(originalListPrice, currency) : undefined;
    }
    
    // Extract weight from multiple possible fields
    let weight: number | undefined;
    const weightSources = [
      data.product_information?.item_weight,
      data.product_information?.shipping_weight,
      data.product_information?.package_weight,
      data.item_weight,
      data.shipping_weight,
      data.weight
    ];
    
    for (const weightSource of weightSources) {
      if (weightSource && typeof weightSource === 'string') {
        const weightMatch = weightSource.match(/(\d+(?:\.\d+)?)\s*(kg|kilogram|pound|lb|g|gram|oz|ounce)/i);
        if (weightMatch) {
          let extractedWeight = parseFloat(weightMatch[1]);
          const unit = weightMatch[2].toLowerCase();
          
          // Convert to kg
          if (unit.includes('pound') || unit.includes('lb')) {
            extractedWeight = extractedWeight * 0.453592; // pounds to kg
          } else if ((unit.includes('g') && !unit.includes('kg')) || unit.includes('gram')) {
            extractedWeight = extractedWeight / 1000; // grams to kg
          } else if (unit.includes('oz') || unit.includes('ounce')) {
            extractedWeight = extractedWeight * 0.0283495; // ounces to kg
          }
          // kg and kilogram stay as is
          
          weight = extractedWeight;
          console.log(`📦 Product weight: ${weight}kg (converted from ${weightMatch[0]})`);
          break; // Found weight, stop checking other sources
        }
      }
    }
    
    if (!weight) {
      console.log('⚠️ No weight found in product data - will use 1kg default for shipping');
    }
    
    // Convert ScraperAPI response to our format
    const product: ScrapedProduct = {
      title: data.name,
      price: bdtPrice,
      originalPrice: bdtOriginalPrice,
      originalCurrency: currency,
      originalPriceValue: originalPriceValue,
      weight: weight,
      image: data.images && data.images.length > 0 ? data.images[0] : '',
      rating: data.average_rating ? parseFloat(data.average_rating.toString()) : undefined,
      reviewCount: data.total_reviews ? parseInt(data.total_reviews.toString()) : undefined,
      description: data.feature_bullets && data.feature_bullets.length > 0 ? data.feature_bullets.slice(0, 3).join('. ') : '',
      features: data.feature_bullets || [],
      availability: data.availability_status === 'In Stock' ? 'in_stock' : 
                   data.availability_status === 'Out of Stock' ? 'out_of_stock' : 'limited',
      store: 'amazon'
    };

    console.log('ScraperAPI success:', product.title);
    return product;

  } catch (error) {
    console.error('ScraperAPI error:', error);
    return null;
  }
}

async function scrapeAmazonFallback(url: string): Promise<ScrapedProduct | null> {
  try {
    // Clean the URL
    const cleanUrl = url.split('?')[0];
    
    // Make HTTP request with realistic headers
    const response = await axios.get(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
      },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);

    // Check if we got a CAPTCHA or blocked page
    if (response.data.includes('robot') || response.data.includes('captcha') || response.data.includes('blocked') || 
        response.data.includes('Continue shopping') || $('title').text().trim() === 'Amazon.com') {
      throw new Error('Amazon has blocked this request. Please try again later or use a different network connection.');
    }

    // Extract title
    let title = '';
    const titleSelectors = ['#productTitle', 'h1[data-automation-id="product-title"]', '.product-title', 'h1'];
    for (const selector of titleSelectors) {
      const element = $(selector).first();
      if (element.text().trim()) {
        title = element.text().trim();
        break;
      }
    }

    if (!title) {
      console.log('Failed to find title with any selector');
      throw new Error('Could not extract product title');
    }

    // Extract price
    let price = 0;
    let originalPrice;
    
    // Current price selectors
    const priceSelectors = [
      '.a-price.a-text-price.a-size-medium.apexPriceToPay .a-offscreen',
      '.a-price-whole',
      '.a-price .a-offscreen'
    ];

    for (const selector of priceSelectors) {
      const element = $(selector).first();
      if (element.text()) {
        const priceText = element.text().trim();
        const cleanPrice = priceText.replace(/[^0-9.,]/g, '').replace(',', '');
        const parsedPrice = parseFloat(cleanPrice) || 0;
        if (parsedPrice > 0) {
          price = parsedPrice;
          break;
        }
      }
    }

    // Original price (if on sale)
    const originalPriceSelectors = [
      '.a-price.a-text-price .a-offscreen',
      '[data-testid="list-price"] .a-price .a-offscreen'
    ];

    for (const selector of originalPriceSelectors) {
      const element = $(selector).first();
      if (element.text()) {
        const priceText = element.text().trim();
        const cleanPrice = priceText.replace(/[^0-9.,]/g, '').replace(',', '');
        const parsedPrice = parseFloat(cleanPrice) || 0;
        if (parsedPrice > 0 && parsedPrice !== price) {
          originalPrice = parsedPrice;
          break;
        }
      }
    }

    // Extract image
    let image = '';
    const imageSelectors = ['#landingImage', '.a-dynamic-image', '#imgBlkFront'];
    for (const selector of imageSelectors) {
      const element = $(selector).first();
      const src = element.attr('src') || element.attr('data-old-hires');
      if (src) {
        image = src;
        break;
      }
    }

    // Extract rating
    let rating;
    const ratingElement = $('.a-icon-alt').first();
    if (ratingElement.text().includes('out of 5')) {
      const ratingMatch = ratingElement.text().match(/(\d+\.?\d*)\s*out of 5/);
      if (ratingMatch) {
        rating = parseFloat(ratingMatch[1]);
      }
    }

    // Extract review count
    let reviewCount;
    const reviewElement = $('#acrCustomerReviewText').first();
    if (reviewElement.text()) {
      const reviewMatch = reviewElement.text().match(/(\d+(?:,\d+)*)/);
      if (reviewMatch) {
        reviewCount = parseInt(reviewMatch[1].replace(/,/g, ''));
      }
    }

    // Extract description from bullet points
    const features: string[] = [];
    $('#feature-bullets ul li span').each((i, el) => {
      if (i < 5) {
        const text = $(el).text().trim();
        if (text.length > 10 && !text.includes('Make sure this fits')) {
          features.push(text);
        }
      }
    });

    const description = features.slice(0, 3).join('. ');

    // Extract weight from product details or shipping information
    let weight: number | undefined;
    const weightSelectors = [
      '#productDetails_detailBullets_sections1 tr td span',
      '#productDetails_techSpec_section_1 tr td',
      '.a-list-item .a-text-bold'
    ];

    for (const selector of weightSelectors) {
      $(selector).each((i, el) => {
        const text = $(el).text().trim();
        if (text.toLowerCase().includes('weight') || text.toLowerCase().includes('shipping weight')) {
          const parent = $(el).parent();
          const fullText = parent.text();
          const weightMatch = fullText.match(/(\d+(?:\.\d+)?)\s*(kg|pound|lb|g|gram)/i);
          if (weightMatch) {
            let extractedWeight = parseFloat(weightMatch[1]);
            const unit = weightMatch[2].toLowerCase();
            
            // Convert to kg
            if (unit.includes('pound') || unit.includes('lb')) {
              extractedWeight = extractedWeight * 0.453592; // pounds to kg
            } else if (unit.includes('g') && !unit.includes('kg')) {
              extractedWeight = extractedWeight / 1000; // grams to kg
            }
            
            weight = extractedWeight;
            return false; // Break the loop
          }
        }
      });
      if (weight) break;
    }

    if (!weight) {
      console.log('⚠️ No weight found in fallback scraping');
    } else {
      console.log(`📦 Product weight from fallback: ${weight}kg`);
    }

    return {
      title,
      price,
      originalPrice,
      weight,
      image,
      rating,
      reviewCount,
      description,
      features,
      availability: 'in_stock' as const,
      store: 'amazon' as const
    };

  } catch (error) {
    console.error('Amazon fallback scraping error:', error);
    return null;
  }
}

async function scrapeAmazon(page: any, url: string): Promise<ScrapedProduct | null> {
  try {
    // Clean the URL to remove tracking parameters
    const cleanUrl = url.split('?')[0];
    
    // Add random delay to appear more human
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
    
    // Try multiple navigation strategies
    let navigationSuccess = false;
    
    // Strategy 1: Direct navigation with domcontentloaded
    try {
      await page.goto(cleanUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
      navigationSuccess = true;
    } catch (error) {
      console.log('Strategy 1 failed, trying strategy 2...');
    }
    
    // Strategy 2: Load with networkidle2 if first fails
    if (!navigationSuccess) {
      try {
        await page.goto(cleanUrl, { waitUntil: 'networkidle2', timeout: 45000 });
        navigationSuccess = true;
      } catch (error) {
        console.log('Strategy 2 failed, trying strategy 3...');
      }
    }
    
    // Strategy 3: Basic load
    if (!navigationSuccess) {
      await page.goto(cleanUrl, { waitUntil: 'load', timeout: 45000 });
    }
    
    // Wait a bit for dynamic content
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Try to wait for key elements with multiple selectors
    try {
      await page.waitForSelector('#productTitle, [data-testid="product-title"], h1', { timeout: 15000 });
    } catch (error) {
      console.log('Continuing without waiting for specific selectors...');
    }

    const product = await page.evaluate(() => {
      // Title extraction with multiple selectors
      const titleSelectors = [
        '#productTitle',
        '[data-testid="product-title"]',
        '.product-title',
        'h1.a-size-large',
        'h1[data-automation-id="product-title"]'
      ];
      
      let title = '';
      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element?.textContent?.trim()) {
          title = element.textContent.trim();
          break;
        }
      }

      // Price extraction with multiple selectors
      const priceSelectors = [
        '.a-price-whole',
        '.a-price .a-offscreen',
        '[data-testid="price"] .a-price .a-offscreen',
        '.a-price-range .a-price .a-offscreen',
        '.a-price.a-text-price.a-size-medium.apexPriceToPay .a-offscreen',
        'span.a-price-symbol + span.a-price-whole'
      ];

      let price = 0;
      let priceText = '';
      for (const selector of priceSelectors) {
        const element = document.querySelector(selector);
        if (element?.textContent) {
          priceText = element.textContent.trim();
          break;
        }
      }

      // Parse price
      if (priceText) {
        const cleanPrice = priceText.replace(/[^0-9.,]/g, '').replace(',', '');
        price = parseFloat(cleanPrice) || 0;
      }

      // Original price (if on sale)
      let originalPrice;
      const originalPriceSelectors = [
        '.a-price.a-text-price .a-offscreen',
        '[data-testid="list-price"] .a-price .a-offscreen',
        '.a-price.a-text-price.a-size-base .a-offscreen'
      ];

      for (const selector of originalPriceSelectors) {
        const element = document.querySelector(selector);
        if (element?.textContent && element.textContent !== priceText) {
          const cleanOriginalPrice = element.textContent.replace(/[^0-9.,]/g, '').replace(',', '');
          originalPrice = parseFloat(cleanOriginalPrice) || undefined;
          break;
        }
      }

      // Image extraction
      const imageSelectors = [
        '#landingImage',
        '[data-testid="product-image"] img',
        '.a-dynamic-image',
        '#imgBlkFront',
        'img[data-old-hires]'
      ];

      let image = '';
      for (const selector of imageSelectors) {
        const element = document.querySelector(selector) as HTMLImageElement;
        if (element?.src) {
          image = element.src;
          break;
        }
        if (element?.getAttribute('data-old-hires')) {
          image = element.getAttribute('data-old-hires') || '';
          break;
        }
      }

      // Rating extraction
      let rating;
      const ratingSelectors = [
        '[data-testid="reviews-block"] .a-icon-alt',
        '.a-icon-alt',
        '.reviewCountTextLinkedHistogram .a-icon-alt',
        'span.a-icon-alt'
      ];

      for (const selector of ratingSelectors) {
        const element = document.querySelector(selector);
        if (element?.textContent?.includes('out of 5')) {
          const ratingMatch = element.textContent.match(/(\d+\.?\d*)\s*out of 5/);
          if (ratingMatch) {
            rating = parseFloat(ratingMatch[1]);
            break;
          }
        }
      }

      // Review count extraction
      let reviewCount;
      const reviewSelectors = [
        '[data-testid="reviews-block"] a[href*="#reviews"]',
        '#acrCustomerReviewText',
        'a[href*="#customerReviews"] span',
        '.a-link-normal span[aria-label*="ratings"]'
      ];

      for (const selector of reviewSelectors) {
        const element = document.querySelector(selector);
        if (element?.textContent) {
          const reviewMatch = element.textContent.match(/(\d+(?:,\d+)*)/);
          if (reviewMatch) {
            reviewCount = parseInt(reviewMatch[1].replace(/,/g, ''));
            break;
          }
        }
      }

      // Description extraction
      let description = '';
      const descSelectors = [
        '#feature-bullets ul li span',
        '[data-testid="feature-bullets"] li',
        '.a-unordered-list.a-vertical li span',
        '#featurebullets_feature_div li span'
      ];

      const features: string[] = [];
      for (const selector of descSelectors) {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el, index) => {
          if (index < 5 && el.textContent?.trim()) { // Limit to 5 features
            const text = el.textContent.trim();
            if (text.length > 10 && !text.includes('Make sure this fits')) {
              features.push(text);
            }
          }
        });
        if (features.length > 0) break;
      }

      description = features.slice(0, 3).join('. ');

      // Extract weight from product details
      let weight: number | undefined;
      const weightSelectors = [
        '#productDetails_detailBullets_sections1 tr td span',
        '#productDetails_techSpec_section_1 tr td',
        '.a-list-item .a-text-bold'
      ];

      for (const selector of weightSelectors) {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => {
          const text = el.textContent?.trim() || '';
          if (text.toLowerCase().includes('weight') || text.toLowerCase().includes('shipping weight')) {
            const parent = el.parentElement;
            const fullText = parent?.textContent || '';
            const weightMatch = fullText.match(/(\d+(?:\.\d+)?)\s*(kg|pound|lb|g|gram)/i);
            if (weightMatch) {
              let extractedWeight = parseFloat(weightMatch[1]);
              const unit = weightMatch[2].toLowerCase();
              
              // Convert to kg
              if (unit.includes('pound') || unit.includes('lb')) {
                extractedWeight = extractedWeight * 0.453592; // pounds to kg
              } else if (unit.includes('g') && !unit.includes('kg')) {
                extractedWeight = extractedWeight / 1000; // grams to kg
              }
              
              weight = extractedWeight;
            }
          }
        });
        if (weight) break;
      }

      // Availability
      let availability: 'in_stock' | 'out_of_stock' | 'limited' = 'in_stock';
      const availabilitySelectors = [
        '#availability span',
        '[data-testid="availability"] span',
        '.a-size-medium.a-color-success',
        '.a-size-medium.a-color-price'
      ];

      for (const selector of availabilitySelectors) {
        const element = document.querySelector(selector);
        if (element?.textContent) {
          const text = element.textContent.toLowerCase();
          if (text.includes('out of stock') || text.includes('unavailable')) {
            availability = 'out_of_stock';
          } else if (text.includes('only') && text.includes('left')) {
            availability = 'limited';
          }
          break;
        }
      }

      return {
        title,
        price,
        originalPrice,
        weight,
        image,
        rating,
        reviewCount,
        description,
        features,
        availability
      };
    });

    if (!product.title) {
      throw new Error('Could not extract product title');
    }

    return {
      ...product,
      store: 'amazon'
    } as ScrapedProduct;

  } catch (error) {
    console.error('Amazon scraping error:', error);
    return null;
  }
}

async function scrapeWalmart(page: any, url: string): Promise<ScrapedProduct | null> {
  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Wait for key elements to load
    await page.waitForSelector('[data-automation-id="product-title"], h1', { timeout: 10000 });

    const product = await page.evaluate(() => {
      // Title
      const titleSelectors = [
        '[data-automation-id="product-title"]',
        'h1[data-automation-id="product-title"]',
        '.prod-ProductTitle',
        'h1'
      ];
      
      let title = '';
      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element?.textContent?.trim()) {
          title = element.textContent.trim();
          break;
        }
      }

      // Price
      const priceSelectors = [
        '[itemprop="price"]',
        '[data-testid="price-current"]',
        '.price-current',
        '.price-group .price-current .price-characteristic'
      ];

      let price = 0;
      for (const selector of priceSelectors) {
        const element = document.querySelector(selector);
        if (element?.textContent) {
          const cleanPrice = element.textContent.replace(/[^0-9.,]/g, '').replace(',', '');
          price = parseFloat(cleanPrice) || 0;
          if (price > 0) break;
        }
      }

      // Image
      const imageSelectors = [
        '.prod-hero-image-image',
        '[data-testid="hero-image"] img',
        '.prod-ProductImage img'
      ];

      let image = '';
      for (const selector of imageSelectors) {
        const element = document.querySelector(selector) as HTMLImageElement;
        if (element?.src) {
          image = element.src;
          break;
        }
      }

      // Rating
      let rating;
      const ratingElement = document.querySelector('.average-rating .average-rating-number');
      if (ratingElement?.textContent) {
        rating = parseFloat(ratingElement.textContent);
      }

      // Review count
      let reviewCount;
      const reviewElement = document.querySelector('.ReviewsHeader .f6');
      if (reviewElement?.textContent) {
        const reviewMatch = reviewElement.textContent.match(/(\d+)/);
        if (reviewMatch) {
          reviewCount = parseInt(reviewMatch[1]);
        }
      }

      return {
        title,
        price,
        image,
        rating,
        reviewCount,
        availability: 'in_stock' as const
      };
    });

    if (!product.title) {
      throw new Error('Could not extract product title');
    }

    return {
      ...product,
      store: 'walmart'
    } as ScrapedProduct;

  } catch (error) {
    console.error('Walmart scraping error:', error);
    return null;
  }
}

async function scrapeEbay(page: any, url: string): Promise<ScrapedProduct | null> {
  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Wait for key elements to load
    await page.waitForSelector('.x-item-title-label, #x-item-title', { timeout: 10000 });

    const product = await page.evaluate(() => {
      // Title
      const titleSelectors = [
        '.x-item-title-label',
        '#x-item-title',
        '.it-ttl'
      ];
      
      let title = '';
      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element?.textContent?.trim()) {
          title = element.textContent.trim();
          break;
        }
      }

      // Price
      const priceSelectors = [
        '.notranslate',
        '.u-flL.condText',
        '.notranslate .price'
      ];

      let price = 0;
      for (const selector of priceSelectors) {
        const element = document.querySelector(selector);
        if (element?.textContent?.includes('$')) {
          const cleanPrice = element.textContent.replace(/[^0-9.,]/g, '').replace(',', '');
          price = parseFloat(cleanPrice) || 0;
          if (price > 0) break;
        }
      }

      // Image
      const imageSelectors = [
        '#icImg',
        '.ux-image-carousel-item img',
        '.img img'
      ];

      let image = '';
      for (const selector of imageSelectors) {
        const element = document.querySelector(selector) as HTMLImageElement;
        if (element?.src) {
          image = element.src;
          break;
        }
      }

      return {
        title,
        price,
        image,
        availability: 'in_stock' as const
      };
    });

    if (!product.title) {
      throw new Error('Could not extract product title');
    }

    return {
      ...product,
      store: 'ebay'
    } as ScrapedProduct;

  } catch (error) {
    console.error('eBay scraping error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    const store = detectStore(url);
    if (!store) {
      return NextResponse.json(
        { success: false, error: 'Unsupported store. Please use Amazon, Walmart, or eBay links.' },
        { status: 400 }
      );
    }

    // Launch browser with enhanced stealth settings
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    });

    const page = await browser.newPage();

    // Enhanced stealth configuration
    await page.evaluateOnNewDocument(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Mock plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // Mock languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });

      // Override the `chrome` property
      window.chrome = {
        runtime: {},
      };

      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Cypress ? 'denied' : 'granted' }) :
          originalQuery(parameters)
      );
    });

    // Set realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Set realistic viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Set comprehensive headers
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0'
    });

    let product: ScrapedProduct | null = null;

    // Scrape based on store
    switch (store) {
      case 'amazon':
        // Try ScraperAPI first (most reliable)
        console.log('Trying ScraperAPI first...');
        product = await scrapeAmazonWithScraperAPI(url);
        
        // If ScraperAPI fails, try Puppeteer
        if (!product) {
          console.log('ScraperAPI failed, trying Puppeteer...');
          product = await scrapeAmazon(page, url);
        }
        
        // If both fail, try fallback HTTP method
        if (!product) {
          console.log('Puppeteer failed, trying fallback method...');
          product = await scrapeAmazonFallback(url);
        }
        
        await browser.close();
        break;
      case 'walmart':
        product = await scrapeWalmart(page, url);
        await browser.close();
        break;
      case 'ebay':
        product = await scrapeEbay(page, url);
        await browser.close();
        break;
    }

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Failed to extract product information. The page structure might have changed, the product may not be available, or the website is blocking our requests. Please try again later.' },
        { status: 500 }
      );
    }

    // Generate a unique ID for the product
    const productId = `${store}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return NextResponse.json({
      success: true,
      product: {
        id: productId,
        url,
        ...product
      }
    });

  } catch (error) {
    console.error('Scraping error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while processing the product link. Please try again.' },
      { status: 500 }
    );
  }
}
