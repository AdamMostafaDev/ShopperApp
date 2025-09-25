import { NextRequest, NextResponse } from 'next/server';
import UserAgent from 'user-agents';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { parsePriceFromScrapedText, convertToBdt, detectCurrency, isBdtPrice, extractPriceWithAdvancedPatterns, validatePrice } from '@/lib/currency';

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
  store: 'amazon' | 'walmart' | 'ebay' | 'other';
  storeName?: string; // Store name for non-partner sites

  // Approval and editing flow
  requiresApproval: boolean; // True for non-partner products
  isEditable: boolean; // True if user can edit product details
  extractionStatus: 'complete' | 'partial' | 'minimal' | 'failed';
  missingFields: string[]; // Fields that couldn't be extracted
  extractionDetails: {
    titleConfidence: number;
    priceConfidence: number;
    imageConfidence: number;
  };
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

function extractStoreNameFromUrl(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    // Remove common prefixes
    let cleanHostname = hostname.replace(/^(www\.|m\.|shop\.|store\.|buy\.)/i, '');

    // Handle special cases for known stores
    const storeNameMappings: { [key: string]: string } = {
      'apple.com': 'Apple',
      'bestbuy.com': 'Best Buy',
      'target.com': 'Target',
      'homedepot.com': 'Home Depot',
      'lowes.com': 'Lowes',
      'costco.com': 'Costco',
      'samsclub.com': 'Sams Club',
      'newegg.com': 'Newegg',
      'bhphotovideo.com': 'B&H Photo',
      'adorama.com': 'Adorama',
      'microcenter.com': 'Micro Center',
      'officedepot.com': 'Office Depot',
      'staples.com': 'Staples',
      'nike.com': 'Nike',
      'adidas.com': 'Adidas',
      'underarmour.com': 'Under Armour',
      'macys.com': 'Macys',
      'nordstrom.com': 'Nordstrom',
      'sephora.com': 'Sephora',
      'ulta.com': 'Ulta Beauty',
      'zara.com': 'Zara',
      'hm.com': 'H&M',
      'forever21.com': 'Forever 21',
      'gap.com': 'Gap',
      'oldnavy.com': 'Old Navy',
      'bananarepublic.com': 'Banana Republic',
      'uniqlo.com': 'Uniqlo',
      'ikea.com': 'IKEA',
      'wayfair.com': 'Wayfair',
      'overstock.com': 'Overstock',
      'etsy.com': 'Etsy',
      'alibaba.com': 'Alibaba',
      'aliexpress.com': 'AliExpress',
      'wish.com': 'Wish',
      'shein.com': 'SHEIN',
      'asos.com': 'ASOS'
    };

    // Check if it's a known store
    for (const [domain, name] of Object.entries(storeNameMappings)) {
      if (cleanHostname.includes(domain)) {
        return name;
      }
    }

    // For unknown stores, extract the main part of the domain
    const domainParts = cleanHostname.split('.');

    // Handle different TLD structures (.com, .co.uk, .com.au, etc.)
    let storeName = domainParts[0];

    // Filter out generic TLDs and country codes
    const genericParts = ['com', 'net', 'org', 'co', 'uk', 'au', 'ca', 'de', 'fr', 'jp', 'in', 'cn'];
    if (genericParts.includes(storeName.toLowerCase()) && domainParts.length > 2) {
      // If the first part is generic, try the subdomain
      const subdomain = hostname.split('.')[0];
      if (!['www', 'm', 'shop', 'store'].includes(subdomain)) {
        storeName = subdomain;
      }
    }

    // Capitalize and clean up the store name
    storeName = storeName
      .replace(/[-_]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    // Return null if we end up with a generic name
    if (['Www', 'Shop', 'Store', 'M'].includes(storeName)) {
      return null;
    }

    return storeName;
  } catch (e) {
    console.error('Error extracting store name from URL:', e);
    return null;
  }
}

function extractStoreNameFromPageTitle(pageTitle: string, url: string): string | null {
  try {
    if (!pageTitle || pageTitle.trim() === '') {
      return null;
    }

    // Common patterns in page titles
    // "Product Name - Store Name"
    // "Product Name | Store Name"
    // "Store Name: Product Name"
    // "Product Name at Store Name"
    // "Buy Product Name - Store Name"

    // Try to extract after common separators
    const separators = [' - ', ' | ', ' – ', ' — ', ' :: ', ' at ', ' from '];

    for (const separator of separators) {
      if (pageTitle.includes(separator)) {
        const parts = pageTitle.split(separator);

        // Usually store name is at the end
        const lastPart = parts[parts.length - 1].trim();

        // Filter out common suffixes
        const cleanedPart = lastPart
          .replace(/\s*(Online Store|Shop|Store|Official Site|Official Store|\.com|\.net|\.org)$/i, '')
          .trim();

        // Check if it's not too long (store names are usually short)
        if (cleanedPart.length > 0 && cleanedPart.length < 30 && !cleanedPart.includes(' - ')) {
          return cleanedPart;
        }

        // Try the first part if it looks like a store name
        const firstPart = parts[0].trim();
        if (firstPart.length < 30 && !firstPart.toLowerCase().includes('buy') &&
            !firstPart.toLowerCase().includes('shop') && !firstPart.toLowerCase().includes('product')) {
          return firstPart;
        }
      }
    }

    // If no separator found, check if the whole title is short enough to be a store name
    const cleanTitle = pageTitle
      .replace(/\s*(Online Store|Shop|Store|Official Site|Official Store)$/i, '')
      .trim();

    if (cleanTitle.length < 30 && cleanTitle.split(' ').length <= 4) {
      return cleanTitle;
    }

    return null;
  } catch (e) {
    console.error('Error extracting store name from page title:', e);
    return null;
  }
}

function evaluateProductExtraction(
  title: string,
  price: number,
  image: string,
  titleConfidence: number,
  priceConfidence: number,
  imageConfidence: number
): {
  extractionStatus: 'complete' | 'partial' | 'minimal' | 'failed';
  missingFields: string[];
} {
  const missingFields: string[] = [];
  let extractedCount = 0;

  // Check title
  if (!title || title === 'Pending Product Details' || title.length < 3) {
    missingFields.push('title');
  } else {
    extractedCount++;
  }

  // Check price
  if (price <= 0) {
    missingFields.push('price');
  } else {
    extractedCount++;
  }

  // Check image
  if (!image || image === '/assets/images/generic-product.svg') {
    missingFields.push('image');
  } else if (image.includes('/assets/logos/')) {
    // Store logo is better than generic, but not ideal
    extractedCount += 0.5;
  } else {
    extractedCount++;
  }

  // Determine extraction status
  let extractionStatus: 'complete' | 'partial' | 'minimal' | 'failed';

  if (extractedCount >= 3) {
    extractionStatus = 'complete';
  } else if (extractedCount >= 2) {
    extractionStatus = 'partial';
  } else if (extractedCount >= 1) {
    extractionStatus = 'minimal';
  } else {
    extractionStatus = 'failed';
  }

  return { extractionStatus, missingFields };
}

function determineApprovalRequirement(
  store: 'amazon' | 'walmart' | 'ebay' | 'other',
  extractionStatus: 'complete' | 'partial' | 'minimal' | 'failed'
): { requiresApproval: boolean; isEditable: boolean } {
  // Partner stores (Amazon, eBay, Walmart) generally don't require approval
  if (store === 'amazon' || store === 'ebay' || store === 'walmart') {
    return {
      requiresApproval: false,
      isEditable: false // Partner products are usually accurate
    };
  }

  // Non-partner stores require approval, especially if extraction is incomplete
  return {
    requiresApproval: true,
    isEditable: true // Allow editing for non-partner products
  };
}

function generateProductFallback(url: string, storeName: string): ScrapedProduct {
  console.log('🔄 Generating fallback product for failed extraction');

  const fallbackTitle = `Product from ${storeName}`;
  const fallbackImage = getStoreLogoMapping(url, storeName) || '/assets/images/generic-product.svg';

  const evaluation = evaluateProductExtraction(fallbackTitle, 0, fallbackImage, 0.3, 0, 0.2);
  const approval = determineApprovalRequirement('other', evaluation.extractionStatus);

  return {
    title: fallbackTitle,
    price: 0,
    originalCurrency: 'USD',
    originalPriceValue: 0,
    image: fallbackImage,
    availability: 'in_stock',
    store: 'other',
    storeName,
    requiresApproval: approval.requiresApproval,
    isEditable: approval.isEditable,
    extractionStatus: evaluation.extractionStatus,
    missingFields: evaluation.missingFields,
    extractionDetails: {
      titleConfidence: 0.3, // Generic title
      priceConfidence: 0,    // No price
      imageConfidence: fallbackImage.includes('generic') ? 0.2 : 0.5 // Logo or generic
    }
  };
}

function getStoreLogoMapping(url: string, storeName?: string): string | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    // Store logo mappings using available assets
    const storeLogoMappings: { [key: string]: string } = {
      // Major retailers
      'apple.com': '/assets/logos/apple-logo.png',
      'amazon.com': '/assets/logos/amazon_logo.png',
      'walmart.com': '/assets/logos/walmart-logo.png',
      'ebay.com': '/assets/logos/ebay-logo.png',
      'bestbuy.com': '/assets/logos/Best_Buy_Logo.svg.png',
      'target.com': '/assets/logos/Target_New.png',

      // Fashion & Apparel
      'nike.com': '/assets/logos/The-Fourth-Nike-Logo-Evolution-1971-–-now.png',
      'adidas.com': '/assets/logos/adidas logo.png',
      'puma.com': '/assets/logos/puma-black-logo-png-701751694774568gw2on2y0un.png',
      'gap.com': '/assets/logos/gap.png',
      'zara.com': '/assets/logos/Zara_Logo-new.png',
      'nordstrom.com': '/assets/logos/ready-edit-nordstrom-logo-transparent-2.png',
      'macys.com': '/assets/logos/macys-logo.png',
      'sephora.com': '/assets/logos/sephora.png',
      'ralphlauren.com': '/assets/logos/ralph-lauren-logo.png',
      'polo.com': '/assets/logos/polo_ralph-lauren_new.png',
      'tommy.com': '/assets/logos/tommy-hilfiger.jpg',
      'calvinklein.com': '/assets/logos/CK_Calvin_Klein_logo.png',
      'louisvuitton.com': '/assets/logos/Louis-Vuitton-logo.png',
      'prada.com': '/assets/logos/Prada-Symbol.png',
      'ray-ban.com': '/assets/logos/Ray-Ban_logo.png',
      'rayban.com': '/assets/logos/Ray-Ban_logo.png',

      // Technology
      'microsoft.com': '/assets/logos/Microsoft logo.png',
      'samsung.com': '/assets/logos/Samsung_newer.png',
      'sony.com': '/assets/logos/sony-2-logo-black-and-white.png',
      'nintendo.com': '/assets/logos/nintendo-2-logo-png-transparent.png',

      // Entertainment & Media
      'disney.com': '/assets/logos/shop-disney-logo.png',
      'disneystore.com': '/assets/logos/shop-disney-logo.png',

      // Beauty & Personal Care
      'loreal.com': '/assets/logos/l-oreal-logo.png',

      // Kids & Baby
      'carters.com': '/assets/logos/carters-logo-120x120.png',
      'cartersoshkosh.com': '/assets/logos/carters-logo-120x120.png'
    };

    // Check direct domain matches first
    for (const [domain, logo] of Object.entries(storeLogoMappings)) {
      if (hostname.includes(domain)) {
        return logo;
      }
    }

    // If no direct match and we have a storeName, try to match by name
    if (storeName) {
      const nameToLogoMap: { [key: string]: string } = {
        'apple': '/assets/logos/apple-logo.png',
        'amazon': '/assets/logos/amazon_logo.png',
        'walmart': '/assets/logos/walmart-logo.png',
        'ebay': '/assets/logos/ebay-logo.png',
        'best buy': '/assets/logos/Best_Buy_Logo.svg.png',
        'target': '/assets/logos/Target_New.png',
        'nike': '/assets/logos/The-Fourth-Nike-Logo-Evolution-1971-–-now.png',
        'adidas': '/assets/logos/adidas logo.png',
        'puma': '/assets/logos/puma-black-logo-png-701751694774568gw2on2y0un.png',
        'gap': '/assets/logos/gap.png',
        'zara': '/assets/logos/Zara_Logo-new.png',
        'nordstrom': '/assets/logos/ready-edit-nordstrom-logo-transparent-2.png',
        'macys': '/assets/logos/macys-logo.png',
        'sephora': '/assets/logos/sephora.png',
        'microsoft': '/assets/logos/Microsoft logo.png',
        'samsung': '/assets/logos/Samsung_newer.png',
        'sony': '/assets/logos/sony-2-logo-black-and-white.png',
        'disney': '/assets/logos/shop-disney-logo.png'
      };

      const normalizedStoreName = storeName.toLowerCase();
      for (const [name, logo] of Object.entries(nameToLogoMap)) {
        if (normalizedStoreName.includes(name)) {
          return logo;
        }
      }
    }

    return null;
  } catch (e) {
    console.error('Error getting store logo mapping:', e);
    return null;
  }
}

async function parseAmazonHTML(html: string, originalUrl: string): Promise<any> {
  const cheerio = require('cheerio');
  const $ = cheerio.load(html);
  
  // Check for blocked content
  if (html.includes('robot') || html.includes('captcha') || html.includes('blocked')) {
    throw new Error('Amazon blocked the request - will retry');
  }
  
  // Extract product data from HTML
  const result: any = {
    name: '',
    pricing: '',
    price: '',
    current_price: '',
    list_price: '',
    images: [],
    average_rating: null,
    total_reviews: null,
    feature_bullets: [],
    availability_status: 'In Stock'
  };
  
  // Extract title
  const titleSelectors = ['#productTitle', 'h1[data-automation-id="product-title"]', '.product-title', 'h1'];
  for (const selector of titleSelectors) {
    const element = $(selector).first();
    if (element.text().trim()) {
      result.name = element.text().trim();
      break;
    }
  }
  
  // Extract price
  const priceSelectors = [
    '.a-price.a-text-price.a-size-medium.apexPriceToPay .a-offscreen',
    '.a-price-whole',
    '.a-price .a-offscreen',
    '.a-price-range .a-offscreen',
    '#priceblock_dealprice',
    '#priceblock_ourprice'
  ];
  
  for (const selector of priceSelectors) {
    const element = $(selector).first();
    if (element.text().trim()) {
      result.pricing = element.text().trim();
      result.price = element.text().trim();
      result.current_price = element.text().trim();
      break;
    }
  }
  
  // Extract images
  const imageSelectors = ['#landingImage', '.a-dynamic-image', '#imgBlkFront'];
  for (const selector of imageSelectors) {
    const element = $(selector).first();
    const src = element.attr('src') || element.attr('data-src');
    if (src) {
      result.images = [src];
      break;
    }
  }
  
  // Extract features
  $('#feature-bullets ul li span').each((i, el) => {
    const text = $(el).text().trim();
    if (text && !text.includes('Make sure') && text.length > 10) {
      result.feature_bullets.push(text);
    }
  });
  
  // Extract rating and reviews
  const ratingElement = $('[data-hook="average-star-rating"] .a-icon-alt, .a-icon-alt');
  if (ratingElement.text()) {
    const ratingText = ratingElement.text();
    const ratingMatch = ratingText.match(/(\d+\.?\d*) out of/);
    if (ratingMatch) {
      result.average_rating = parseFloat(ratingMatch[1]);
    }
  }
  
  const reviewElement = $('[data-hook="total-review-count"], #acrCustomerReviewText');
  if (reviewElement.text()) {
    const reviewText = reviewElement.text();
    const reviewMatch = reviewText.match(/([\d,]+)/);
    if (reviewMatch) {
      result.total_reviews = parseInt(reviewMatch[1].replace(/,/g, ''));
    }
  }
  
  return result;
}

async function scrapeAmazonWithScraperAPI(url: string): Promise<ScrapedProduct | null> {
  const MAX_RETRIES = 5; // Increased from 3
  const RETRY_DELAY = 2000; // Reduced from 3000ms
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const apiKey = process.env.SCRAPER_API_KEY;
      if (!apiKey) {
        throw new Error('ScraperAPI key not configured');
      }

      console.log(`🔄 ScraperAPI attempt ${attempt}/${MAX_RETRIES} for URL: ${url}`);

      // Try multiple extraction methods for ASIN/product ID
      let asin = '';
      let useStructuredAPI = true;
      
      // Method 1: Standard ASIN pattern
      const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/);
      if (asinMatch) {
        asin = asinMatch[1];
      } else {
        // Method 2: Alternative Amazon patterns
        const altPatterns = [
          /\/gp\/product\/([A-Z0-9]{10})/,
          /\/exec\/obidos\/ASIN\/([A-Z0-9]{10})/,
          /[?&]asin=([A-Z0-9]{10})/i,
          /\/([A-Z0-9]{10})(?:\/|$|\?)/
        ];
        
        for (const pattern of altPatterns) {
          const match = url.match(pattern);
          if (match) {
            asin = match[1];
            break;
          }
        }
        
        // If no ASIN found, fall back to raw URL scraping
        if (!asin) {
          console.log('⚠️ No ASIN found, using raw URL scraping');
          useStructuredAPI = false;
        }
      }

      let scraperUrl: string;
      
      if (useStructuredAPI && asin) {
        // Use structured API with enhanced parameters and US domain
        scraperUrl = `https://api.scraperapi.com/structured/amazon/product?api_key=${apiKey}&asin=${asin}&domain=amazon.com&render=true&wait_for=5&timeout=120000&premium=true&device_type=desktop&session_number=${attempt}`;
      } else {
        // Use raw scraping API as fallback with enhanced parameters
        const encodedUrl = encodeURIComponent(url);
        scraperUrl = `https://api.scraperapi.com/?api_key=${apiKey}&url=${encodedUrl}&render=true&wait_for=5&timeout=120000&premium=true&device_type=desktop&session_number=${attempt}&retry_404=true`;
      }
      
      const response = await fetch(scraperUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ScraperAPI HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      let data;
      if (useStructuredAPI && asin) {
        data = await response.json();
      } else {
        // Parse raw HTML response
        const html = await response.text();
        data = await parseAmazonHTML(html, url);
      }
    
    console.log('📊 ScraperAPI Raw Response:', {
      name: data.name,
      pricing: data.pricing,
      list_price: data.list_price,
      price: data.price,
      current_price: data.current_price,
      availability_status: data.availability_status,
      images_count: data.images?.length || 0,
      all_price_fields: Object.keys(data).filter(key => key.toLowerCase().includes('price'))
    });
    
    if (!data || !data.name) {
      throw new Error('We were unable to process this product URL. Please verify the link is correct or contact our support team for assistance.');
    }

      // Try multiple price fields to get the best price data
      let originalPriceValue = 0;
      let originalListPrice = undefined;
      let currency = 'USD';

      // Priority order for price extraction
      const priceFields = [data.pricing, data.price, data.current_price, data.list_price, data.sale_price];
      
      for (const priceField of priceFields) {
        if (priceField) {
          const parsedPrice = parsePriceFromScrapedText(priceField);
          if (parsedPrice > 0) {
            originalPriceValue = parsedPrice;
            currency = detectCurrency(priceField);
            break;
          }
        }
      }
      
      // Set list price if available and different from main price
      if (data.list_price) {
        const listParsed = parsePriceFromScrapedText(data.list_price);
        if (listParsed > 0 && listParsed !== originalPriceValue) {
          originalListPrice = listParsed;
        }
      }
      
      console.log('💰 Price Parsing Results:', {
        raw_pricing: data.pricing,
        parsed_price: originalPriceValue,
        raw_list_price: data.list_price,
        parsed_list_price: originalListPrice,
        detected_currency: currency
      });

      // CRITICAL: If price is 0 or undefined, retry (except on last attempt)
      if (originalPriceValue <= 0 && attempt < MAX_RETRIES) {
        console.log(`🚨 Attempt ${attempt}: Price is $${originalPriceValue} - RETRYING in ${RETRY_DELAY/1000}s...`);
        // Use longer delay for pricing issues (might be temporary)
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * 1.5));
        continue; // Try again
      }
      
      // If still no price on final attempt, throw error
      if (originalPriceValue <= 0) {
        throw new Error(`❌ FINAL ATTEMPT: Could not extract valid price after ${MAX_RETRIES} attempts. Product pricing may be unavailable.`);
      }

      console.log(`✅ Valid price found on attempt ${attempt}: $${originalPriceValue} ${currency}`);
    
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
    
    // Amazon products have high confidence and don't require approval
    const titleConfidence = data.name && data.name.length > 3 ? 0.95 : 0.3;
    const imageUrl = data.images && data.images.length > 0 ? data.images[0] : '';
    const imageConfidence = imageUrl ? 0.95 : 0.1;
    const priceConfidence = originalPriceValue > 0 ? 0.95 : 0;

    const evaluation = evaluateProductExtraction(data.name, bdtPrice, imageUrl, titleConfidence, priceConfidence, imageConfidence);
    const approval = determineApprovalRequirement('amazon', evaluation.extractionStatus);

    // Convert ScraperAPI response to our format
    const product: ScrapedProduct = {
      title: data.name,
      price: bdtPrice,
      originalPrice: bdtOriginalPrice,
      originalCurrency: currency,
      originalPriceValue: originalPriceValue,
      weight: weight,
      image: imageUrl,
      rating: data.average_rating ? parseFloat(data.average_rating.toString()) : undefined,
      reviewCount: data.total_reviews ? parseInt(data.total_reviews.toString()) : undefined,
      description: data.feature_bullets && data.feature_bullets.length > 0 ? data.feature_bullets.slice(0, 3).join('. ') : '',
      features: data.feature_bullets || [],
      availability: data.availability_status === 'In Stock' ? 'in_stock' :
                   data.availability_status === 'Out of Stock' ? 'out_of_stock' : 'limited',
      store: 'amazon',
      requiresApproval: approval.requiresApproval,
      isEditable: approval.isEditable,
      extractionStatus: evaluation.extractionStatus,
      missingFields: evaluation.missingFields,
      extractionDetails: {
        titleConfidence,
        priceConfidence,
        imageConfidence
      }
    };

      console.log('ScraperAPI success:', product.title);
      return product;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ ScraperAPI attempt ${attempt} failed:`, errorMessage);
      
      // Check if this is a retriable error
      const isRetriableError = 
        errorMessage.includes('timeout') ||
        errorMessage.includes('HTTP 5') ||
        errorMessage.includes('blocked') ||
        errorMessage.includes('network') ||
        errorMessage.includes('ECONNRESET') ||
        errorMessage.includes('ETIMEDOUT');
      
      if (attempt === MAX_RETRIES) {
        console.error('🚫 All ScraperAPI attempts failed');
        return null;
      }
      
      // Use different retry delays based on error type
      let retryDelay = RETRY_DELAY;
      if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        retryDelay = RETRY_DELAY * 3; // Longer delay for rate limits
      } else if (errorMessage.includes('blocked') || errorMessage.includes('captcha')) {
        retryDelay = RETRY_DELAY * 2; // Medium delay for blocks
      }
      
      // Skip retry for non-retriable errors on later attempts
      if (!isRetriableError && attempt >= 3) {
        console.log(`🚫 Non-retriable error on attempt ${attempt}, skipping remaining retries`);
        return null;
      }
      
      // Wait before next retry
      console.log(`⏳ Waiting ${retryDelay/1000}s before next attempt... (Error type: ${isRetriableError ? 'retriable' : 'non-retriable'})`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  // This should never be reached, but just in case
  return null;
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

async function scrapeUniversalWithScraperAPI(url: string): Promise<ScrapedProduct | null> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const apiKey = process.env.SCRAPER_API_KEY;
      if (!apiKey) {
        throw new Error('ScraperAPI key not configured');
      }

      console.log(`🔄 Universal ScraperAPI attempt ${attempt}/${MAX_RETRIES} for URL: ${url}`);

      // Use raw scraping API with render=true for dynamic content
      const encodedUrl = encodeURIComponent(url);
      const scraperUrl = `https://api.scraperapi.com/?api_key=${apiKey}&url=${encodedUrl}&render=true&wait_for=3&timeout=60000`;

      const response = await fetch(scraperUrl, {
        timeout: 70000
      });

      if (!response.ok) {
        throw new Error(`ScraperAPI HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Dynamic title extraction - try multiple common selectors
      let title = '';
      const titleSelectors = [
        'h1',
        '[itemprop="name"]',
        '.product-title',
        '.product-name',
        '.product_title',
        '.item-title',
        '[data-testid*="title"]',
        '.title',
        'meta[property="og:title"]',
        'meta[name="twitter:title"]',
        'title'
      ];

      for (const selector of titleSelectors) {
        if (selector.startsWith('meta')) {
          const element = $(selector).first();
          const content = element.attr('content');
          if (content && content.trim()) {
            title = content.trim();
            break;
          }
        } else if (selector === 'title') {
          const element = $(selector).first();
          if (element.text().trim()) {
            // Remove store name from title if present
            title = element.text().trim().replace(/ - .+$/, '');
            break;
          }
        } else {
          const element = $(selector).first();
          if (element.text().trim() && element.text().length > 5) {
            title = element.text().trim();
            break;
          }
        }
      }

      if (!title) {
        throw new Error('Could not extract product title');
      }

      // Comprehensive price extraction with fallback hierarchy
      let originalPriceValue = 0;
      let currency = 'USD';
      let priceConfidence = 0;

      console.log('💰 Starting comprehensive price extraction...');

      // Step 1: Meta tags (highest priority)
      const metaPriceSelectors = [
        'meta[property="product:price:amount"]',
        'meta[property="og:price:amount"]',
        'meta[itemprop="price"]',
        'meta[name="price"]'
      ];

      for (const selector of metaPriceSelectors) {
        const element = $(selector).first();
        const content = element.attr('content');
        if (content) {
          const parsed = parseFloat(content);
          if (parsed > 0) {
            originalPriceValue = parsed;
            priceConfidence = 0.9;
            // Get currency from meta tag
            const currencyMeta = $('meta[property="product:price:currency"], meta[property="og:price:currency"]').first();
            currency = currencyMeta.attr('content') || 'USD';
            console.log(`💰 Meta tag price found: ${originalPriceValue} ${currency} (confidence: ${priceConfidence})`);
            break;
          }
        }
      }

      // Step 2: JSON-LD structured data
      if (originalPriceValue <= 0) {
        const jsonLdScripts = $('script[type="application/ld+json"]');
        jsonLdScripts.each((i, script) => {
          try {
            const json = JSON.parse($(script).html() || '{}');
            if (json['@type'] === 'Product' && json.offers) {
              const offers = Array.isArray(json.offers) ? json.offers[0] : json.offers;
              if (offers.price) {
                originalPriceValue = parseFloat(offers.price);
                currency = offers.priceCurrency || 'USD';
                priceConfidence = 0.85;
                console.log(`💰 JSON-LD price found: ${originalPriceValue} ${currency} (confidence: ${priceConfidence})`);
                return false; // Break out of each loop
              }
            }
          } catch (e) {
            // Invalid JSON, continue
          }
        });
      }

      // Step 3: Standard price selectors
      if (originalPriceValue <= 0) {
        const priceSelectors = [
          '[itemprop="price"]',
          '.price:not(.old-price):not(.was-price)',
          '.product-price:not(.old-price)',
          '.regular-price',
          '.sale-price',
          '.current-price',
          '[data-testid*="price"]',
          '.amount',
          'span[class*="price"]:not([class*="old"]):not([class*="was"])',
          'div[class*="price"]:not([class*="old"]):not([class*="was"])',
          'p[class*="price"]'
        ];

        for (const selector of priceSelectors) {
          const element = $(selector).first();
          const priceText = element.text().trim() || element.attr('content') || element.attr('data-price');
          if (priceText) {
            const parsedPrice = parsePriceFromScrapedText(priceText);
            if (parsedPrice > 0) {
              originalPriceValue = parsedPrice;
              currency = detectCurrency(priceText);
              priceConfidence = 0.7;
              console.log(`💰 Selector price found: ${originalPriceValue} ${currency} (confidence: ${priceConfidence})`);
              break;
            }
          }
        }
      }

      // Step 4: Advanced pattern matching on full page content
      if (originalPriceValue <= 0) {
        console.log('💰 Trying advanced pattern matching...');
        const pageText = $.html();
        const advancedResult = extractPriceWithAdvancedPatterns(pageText, currency);
        if (advancedResult.price > 0) {
          originalPriceValue = advancedResult.price;
          priceConfidence = advancedResult.confidence;
          console.log(`💰 Advanced pattern price found: ${originalPriceValue} ${currency} (confidence: ${priceConfidence})`);
        }
      }

      // Step 5: Validate the extracted price
      if (originalPriceValue > 0) {
        const validation = validatePrice(originalPriceValue, currency);
        if (!validation.isValid) {
          console.log(`⚠️ Price validation failed: ${validation.reason}`);
          originalPriceValue = 0;
          priceConfidence = 0;
        } else {
          console.log(`✅ Price validation passed: ${originalPriceValue} ${currency}`);
        }
      }

      if (originalPriceValue <= 0) {
        console.log('⚠️ No valid price found after comprehensive extraction');
      }

      // Dynamic image extraction with fallback hierarchy
      let image = '';
      const imageSelectors = [
        'meta[property="og:image"]',
        'meta[name="twitter:image"]',
        '[itemprop="image"]',
        '.product-image img',
        '.product-photo img',
        '.main-image img',
        '[data-testid*="image"] img',
        'picture img',
        'img[alt*="product"]',
        'img[class*="product"]',
        'img[src*="product"]'
      ];

      // Step 1: Try to extract product image
      for (const selector of imageSelectors) {
        if (selector.startsWith('meta')) {
          const element = $(selector).first();
          const content = element.attr('content');
          if (content) {
            image = content;
            // Make sure it's an absolute URL
            if (image.startsWith('//')) {
              image = 'https:' + image;
            } else if (image.startsWith('/')) {
              const baseUrl = new URL(url);
              image = baseUrl.origin + image;
            }
            break;
          }
        } else {
          const element = $(selector).first();
          const src = element.attr('src') || element.attr('data-src') || element.attr('srcset')?.split(',')[0]?.trim().split(' ')[0];
          if (src) {
            image = src;
            // Make sure it's an absolute URL
            if (image.startsWith('//')) {
              image = 'https:' + image;
            } else if (image.startsWith('/')) {
              const baseUrl = new URL(url);
              image = baseUrl.origin + image;
            }
            break;
          }
        }
      }

      // Image fallback hierarchy implementation
      if (!image) {
        console.log('⚠️ No product image found, trying fallback options...');

        // Step 2: Try OpenGraph image (already attempted above, but double-check)
        const ogImage = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content');
        if (ogImage) {
          image = ogImage.startsWith('//') ? 'https:' + ogImage : ogImage;
          console.log('📸 Using OpenGraph image fallback');
        } else {
          // Step 3: Try store logo based on URL/storeName
          const storeLogo = getStoreLogoMapping(url, storeName);
          if (storeLogo) {
            image = storeLogo;
            console.log(`📸 Using store logo fallback: ${storeLogo}`);
          } else {
            // Step 4: Final fallback - generic product image
            image = '/assets/images/generic-product.svg';
            console.log('📸 Using generic product image fallback');
          }
        }
      } else {
        console.log('📸 Product image extracted successfully');
      }

      // Convert price to BDT if needed
      let bdtPrice: number = 0;
      if (originalPriceValue > 0) {
        if (currency === 'BDT') {
          bdtPrice = originalPriceValue;
        } else {
          bdtPrice = await convertToBdt(originalPriceValue, currency);
        }
      }

      // Extract store name with fallback logic
      let storeName: string = 'Pending Product Details';

      // Step 1: Try to extract from URL
      const urlStoreName = extractStoreNameFromUrl(url);
      if (urlStoreName) {
        storeName = urlStoreName;
        console.log(`📍 Store name from URL: ${storeName}`);
      } else {
        // Step 2: Try to extract from page title
        const pageTitle = $('title').text().trim() || title;
        const titleStoreName = extractStoreNameFromPageTitle(pageTitle, url);
        if (titleStoreName) {
          storeName = titleStoreName;
          console.log(`📍 Store name from page title: ${storeName}`);
        } else {
          // Step 3: Use default fallback
          console.log(`⚠️ Could not extract store name, using default: ${storeName}`);
        }
      }

      // Evaluate extraction quality and determine approval requirements
      const titleConfidence = title && title !== 'Pending Product Details' ? 0.8 : 0.3;
      const imageConfidence = image && !image.includes('generic') && !image.includes('logos') ? 0.8 :
                              image && image.includes('logos') ? 0.5 : 0.2;

      const evaluation = evaluateProductExtraction(title, bdtPrice, image, titleConfidence, priceConfidence, imageConfidence);
      const approval = determineApprovalRequirement('other', evaluation.extractionStatus);

      console.log(`✅ Universal scraping successful: ${title.substring(0, 50)}... (Status: ${evaluation.extractionStatus})`);
      console.log(`🔍 Extraction details: Title confidence: ${titleConfidence}, Price confidence: ${priceConfidence}, Image confidence: ${imageConfidence}`);
      console.log(`📋 Requires approval: ${approval.requiresApproval}, Editable: ${approval.isEditable}`);

      if (evaluation.missingFields.length > 0) {
        console.log(`⚠️ Missing fields: ${evaluation.missingFields.join(', ')}`);
      }

      return {
        title,
        price: bdtPrice,
        originalCurrency: currency,
        originalPriceValue: originalPriceValue,
        image,
        availability: 'in_stock',
        store: 'other',
        storeName,
        requiresApproval: approval.requiresApproval,
        isEditable: approval.isEditable,
        extractionStatus: evaluation.extractionStatus,
        missingFields: evaluation.missingFields,
        extractionDetails: {
          titleConfidence,
          priceConfidence,
          imageConfidence
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Universal ScraperAPI attempt ${attempt} failed:`, errorMessage);

      if (attempt === MAX_RETRIES) {
        console.error('🚫 All Universal ScraperAPI attempts failed');
        return null;
      }

      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }

  return null;
}

async function scrapeUniversalFallback(url: string): Promise<ScrapedProduct | null> {
  try {
    console.log('📋 Using Universal HTML fallback scraper');

    // Make HTTP request with realistic headers
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br'
      },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);

    // Try to extract from OpenGraph tags first (most reliable)
    let title = $('meta[property="og:title"]').attr('content') ||
               $('meta[name="twitter:title"]').attr('content') || '';

    if (!title) {
      // Fall back to regular selectors
      const titleSelectors = ['h1', '[itemprop="name"]', '.product-title', '.product-name', 'title'];
      for (const selector of titleSelectors) {
        const element = $(selector).first();
        if (element.text().trim()) {
          title = element.text().trim();
          if (selector === 'title') {
            // Clean up title tag
            title = title.replace(/ - .+$/, '');
          }
          break;
        }
      }
    }

    if (!title) {
      throw new Error('Could not extract product title');
    }

    // Comprehensive price extraction with fallback hierarchy (HTML Fallback)
    let originalPriceValue = 0;
    let currency = 'USD';
    let priceConfidence = 0;

    console.log('💰 [HTML Fallback] Starting comprehensive price extraction...');

    // Step 1: OpenGraph/Meta tags (highest priority)
    const ogPrice = $('meta[property="product:price:amount"], meta[property="og:price:amount"]').attr('content');
    if (ogPrice) {
      originalPriceValue = parseFloat(ogPrice);
      const ogCurrency = $('meta[property="product:price:currency"], meta[property="og:price:currency"]').attr('content');
      currency = ogCurrency || 'USD';
      priceConfidence = 0.9;
      console.log(`💰 [HTML Fallback] Meta tag price: ${originalPriceValue} ${currency} (confidence: ${priceConfidence})`);
    }

    // Step 2: Standard price selectors
    if (originalPriceValue <= 0) {
      const priceSelectors = [
        '[itemprop="price"]',
        '.price:not(.old-price):not(.was-price)',
        '.product-price:not(.old-price)',
        '.current-price',
        '.regular-price',
        '.sale-price',
        'span[class*="price"]:not([class*="old"]):not([class*="was"])',
        'div[class*="price"]:not([class*="old"]):not([class*="was"])',
        '[data-testid*="price"]'
      ];

      for (const selector of priceSelectors) {
        const element = $(selector).first();
        const priceText = element.text().trim() || element.attr('content');
        if (priceText) {
          const parsedPrice = parsePriceFromScrapedText(priceText);
          if (parsedPrice > 0) {
            originalPriceValue = parsedPrice;
            currency = detectCurrency(priceText);
            priceConfidence = 0.7;
            console.log(`💰 [HTML Fallback] Selector price: ${originalPriceValue} ${currency} (confidence: ${priceConfidence})`);
            break;
          }
        }
      }
    }

    // Step 3: Advanced pattern matching
    if (originalPriceValue <= 0) {
      console.log('💰 [HTML Fallback] Trying advanced pattern matching...');
      const pageText = $.html();
      const advancedResult = extractPriceWithAdvancedPatterns(pageText, currency);
      if (advancedResult.price > 0) {
        originalPriceValue = advancedResult.price;
        priceConfidence = advancedResult.confidence;
        console.log(`💰 [HTML Fallback] Advanced pattern price: ${originalPriceValue} ${currency} (confidence: ${priceConfidence})`);
      }
    }

    // Step 4: Validate the extracted price
    if (originalPriceValue > 0) {
      const validation = validatePrice(originalPriceValue, currency);
      if (!validation.isValid) {
        console.log(`⚠️ [HTML Fallback] Price validation failed: ${validation.reason}`);
        originalPriceValue = 0;
        priceConfidence = 0;
      } else {
        console.log(`✅ [HTML Fallback] Price validation passed: ${originalPriceValue} ${currency}`);
      }
    }

    if (originalPriceValue <= 0) {
      console.log('⚠️ [HTML Fallback] No valid price found after comprehensive extraction');
    }

    // Extract image with fallback hierarchy
    let image = '';

    // Step 1: Try OpenGraph and Twitter images first (most reliable)
    const ogImage = $('meta[property="og:image"]').attr('content') ||
                   $('meta[name="twitter:image"]').attr('content');

    if (ogImage) {
      image = ogImage.startsWith('//') ? 'https:' + ogImage : ogImage;
      console.log('📸 Product image from OpenGraph/Twitter meta tags');
    } else {
      // Step 2: Try product-specific image selectors
      const imageSelectors = [
        '[itemprop="image"]',
        '.product-image img',
        '.main-image img',
        'img[alt*="product"]',
        'img[class*="product"]'
      ];

      for (const selector of imageSelectors) {
        const element = $(selector).first();
        const src = element.attr('src') || element.attr('data-src');
        if (src) {
          image = src;
          // Make sure it's an absolute URL
          if (image.startsWith('//')) {
            image = 'https:' + image;
          } else if (image.startsWith('/')) {
            const baseUrl = new URL(url);
            image = baseUrl.origin + image;
          }
          console.log('📸 Product image from page selectors');
          break;
        }
      }
    }

    // Image fallback hierarchy implementation
    if (!image) {
      console.log('⚠️ No product image found, trying fallback options...');

      // Step 3: Try store logo based on URL (we'll get storeName later)
      const storeLogo = getStoreLogoMapping(url);
      if (storeLogo) {
        image = storeLogo;
        console.log(`📸 Using store logo fallback: ${storeLogo}`);
      } else {
        // Step 4: Final fallback - generic product image
        image = '/assets/images/generic-product.svg';
        console.log('📸 Using generic product image fallback');
      }
    }

    // Convert price to BDT
    let bdtPrice: number = 0;
    if (originalPriceValue > 0) {
      if (currency === 'BDT') {
        bdtPrice = originalPriceValue;
      } else {
        bdtPrice = await convertToBdt(originalPriceValue, currency);
      }
    }

    // Extract store name with fallback logic
    let storeName: string = 'Pending Product Details';

    // Step 1: Try to extract from URL
    const urlStoreName = extractStoreNameFromUrl(url);
    if (urlStoreName) {
      storeName = urlStoreName;
      console.log(`📍 Store name from URL: ${storeName}`);
    } else {
      // Step 2: Try to extract from page title
      const pageTitle = $('title').text().trim() || title;
      const titleStoreName = extractStoreNameFromPageTitle(pageTitle, url);
      if (titleStoreName) {
        storeName = titleStoreName;
        console.log(`📍 Store name from page title: ${storeName}`);
      } else {
        // Step 3: Use default fallback
        console.log(`⚠️ Could not extract store name, using default: ${storeName}`);
      }
    }

    // Evaluate extraction quality and determine approval requirements
    const titleConfidence = title && title !== 'Pending Product Details' ? 0.8 : 0.3;
    const imageConfidence = image && !image.includes('generic') && !image.includes('logos') ? 0.8 :
                            image && image.includes('logos') ? 0.5 : 0.2;

    const evaluation = evaluateProductExtraction(title, bdtPrice, image, titleConfidence, priceConfidence, imageConfidence);
    const approval = determineApprovalRequirement('other', evaluation.extractionStatus);

    console.log(`✅ Universal fallback scraping successful: ${title.substring(0, 50)}... (Status: ${evaluation.extractionStatus})`);
    console.log(`🔍 [HTML Fallback] Extraction details: Title: ${titleConfidence}, Price: ${priceConfidence}, Image: ${imageConfidence}`);
    console.log(`📋 [HTML Fallback] Requires approval: ${approval.requiresApproval}, Editable: ${approval.isEditable}`);

    if (evaluation.missingFields.length > 0) {
      console.log(`⚠️ [HTML Fallback] Missing fields: ${evaluation.missingFields.join(', ')}`);
    }

    return {
      title,
      price: bdtPrice,
      originalCurrency: currency,
      originalPriceValue: originalPriceValue,
      image,
      availability: 'in_stock',
      store: 'other',
      storeName,
      requiresApproval: approval.requiresApproval,
      isEditable: approval.isEditable,
      extractionStatus: evaluation.extractionStatus,
      missingFields: evaluation.missingFields,
      extractionDetails: {
        titleConfidence,
        priceConfidence,
        imageConfidence
      }
    };

  } catch (error) {
    console.error('Universal fallback scraping error:', error);
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
    let product: ScrapedProduct | null = null;

    // Scrape based on store type
    if (store) {
      // Handle partner stores (Amazon, Walmart, eBay)
      switch (store) {
        case 'amazon':
          console.log('Using ScraperAPI for Amazon...');
          product = await scrapeAmazonWithScraperAPI(url);
          break;
        case 'walmart':
          console.log('Walmart scraping not yet implemented with ScraperAPI');
          return NextResponse.json(
            { success: false, error: 'Walmart scraping temporarily unavailable. Please use Amazon or other links.' },
            { status: 501 }
          );
        case 'ebay':
          console.log('eBay scraping not yet implemented with ScraperAPI');
          return NextResponse.json(
            { success: false, error: 'eBay scraping temporarily unavailable. Please use Amazon or other links.' },
            { status: 501 }
          );
      }
    } else {
      // Handle non-partner stores with universal scraper
      console.log('🌐 Detected non-partner website, using universal scraper...');

      // Try ScraperAPI first
      product = await scrapeUniversalWithScraperAPI(url);

      // If ScraperAPI fails, try fallback HTML scraper
      if (!product) {
        console.log('📋 ScraperAPI failed, trying HTML fallback...');
        product = await scrapeUniversalFallback(url);
      }
    }

    if (!product) {
      // Task 1.8: Handle cases where we cannot find any information
      console.log('🔄 All scraping methods failed, generating fallback product');

      try {
        // Extract basic store information for fallback
        let fallbackStoreName = 'Unknown Store';
        try {
          const urlStoreName = extractStoreNameFromUrl(url);
          if (urlStoreName) {
            fallbackStoreName = urlStoreName;
          } else {
            const hostname = new URL(url).hostname.replace('www.', '');
            const domainParts = hostname.split('.');
            fallbackStoreName = domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1);
          }
        } catch (e) {
          // Keep default fallbackStoreName
        }

        // Generate fallback product (Task 1.8 implementation)
        product = generateProductFallback(url, fallbackStoreName);

        console.log(`✅ Generated fallback product for ${fallbackStoreName}`);
        console.log(`📋 Fallback product requires approval: ${product.requiresApproval}, editable: ${product.isEditable}`);

      } catch (fallbackError) {
        console.error('❌ Even fallback generation failed:', fallbackError);
        return NextResponse.json(
          {
            success: false,
            error: 'We were unable to process this product URL. Please verify the link is correct or contact our support team for assistance.',
            extractionStatus: 'failed',
            manualEntryRequired: true
          },
          { status: 500 }
        );
      }
    }

    // Generate a unique ID for the product
    const storeIdentifier = product.store === 'other' ? 'universal' : product.store;
    const productId = `${storeIdentifier}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
      { success: false, error: 'We were unable to process this product URL. Please verify the link is correct or contact our support team for assistance.' },
      { status: 500 }
    );
  }
}
