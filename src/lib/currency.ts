// Real-time currency conversion to BDT using exchangeratesapi.io

const EXCHANGE_API_KEY = 'e7cd555c08dcb78c0280a29dc308f453';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour cache

// Global request throttling for ScraperAPI
let lastScraperRequest = 0;
const SCRAPER_THROTTLE_MS = 2000; // 2 seconds between requests

// Sleep function for delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Google currency conversion using Scraper API with retry mechanism
async function getGoogleExchangeRate(fromCurrency: string, toCurrency: string = 'BDT'): Promise<number> {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      attempt++;

      const scraperApiKey = process.env.SCRAPER_API_KEY;
      if (!scraperApiKey) {
        throw new Error('SCRAPER_API_KEY environment variable is not set');
      }

      // Throttle requests to prevent API overload
      const now = Date.now();
      const timeSinceLastRequest = now - lastScraperRequest;
      if (timeSinceLastRequest < SCRAPER_THROTTLE_MS) {
        const waitTime = SCRAPER_THROTTLE_MS - timeSinceLastRequest;
        console.log(`⏱️ Throttling ScraperAPI request - waiting ${waitTime}ms`);
        await sleep(waitTime);
      }
      lastScraperRequest = Date.now();

      // Construct Google search query for currency conversion
      const query = `1 ${fromCurrency} to ${toCurrency}`;
      const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

      // Enhanced ScraperAPI parameters to avoid blocks
      const scraperParams = new URLSearchParams({
        api_key: scraperApiKey,
        url: googleUrl,
        render: 'false', // Don't render JavaScript - faster
        premium: 'true',  // Use premium endpoints
        country_code: 'us', // Use US proxy
        device_type: 'desktop'
      });

      const scraperUrl = `http://api.scraperapi.com?${scraperParams.toString()}`;

      console.log(`Fetching Google exchange rate (attempt ${attempt}/${maxRetries}): ${fromCurrency} to ${toCurrency}`);

      const response = await fetch(scraperUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 30000 // 30 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`❌ ScraperAPI attempt ${attempt} failed: ${response.status} ${response.statusText} - ${errorText}`);

        if (attempt === maxRetries) {
          throw new Error(`ScraperAPI request failed after ${maxRetries} attempts: ${response.status} ${response.statusText}`);
        }

        // Exponential backoff delay
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(`⏳ Retrying in ${delayMs}ms...`);
        await sleep(delayMs);
        continue;
      }

      const html = await response.text();
      console.log(`✅ ScraperAPI success on attempt ${attempt}/${maxRetries}`);

      // Extract conversion rate from Google's response
      // Google typically shows the rate in a format like "1 USD = 110.50 BDT"
      // We need to find the converted value

      // Pattern 1: Look for the main conversion result
      const ratePattern = /data-exchange-rate="([0-9.]+)"/;
      const rateMatch = html.match(ratePattern);

      if (rateMatch && rateMatch[1]) {
        const rate = parseFloat(rateMatch[1]);
        console.log(`✅ Google exchange rate found (pattern 1): 1 ${fromCurrency} = ${rate} ${toCurrency}`);
        return rate;
      }

      // Pattern 2: Alternative pattern for the conversion result
      const altPattern = new RegExp(`1\\s*${fromCurrency}\\s*=\\s*([0-9.,]+)\\s*${toCurrency}`, 'i');
      const altMatch = html.match(altPattern);

      if (altMatch && altMatch[1]) {
        const rate = parseFloat(altMatch[1].replace(',', ''));
        console.log(`✅ Google exchange rate found (pattern 2): 1 ${fromCurrency} = ${rate} ${toCurrency}`);
        return rate;
      }

      // Pattern 3: Look in the calculator widget
      const calcPattern = /<div[^>]*class="[^"]*BNeawe[^"]*"[^>]*>([0-9.,]+)\s*Bangladeshi/i;
      const calcMatch = html.match(calcPattern);

      if (calcMatch && calcMatch[1]) {
        const rate = parseFloat(calcMatch[1].replace(',', ''));
        console.log(`✅ Google exchange rate found (pattern 3): 1 ${fromCurrency} = ${rate} ${toCurrency}`);
        return rate;
      }

      // Pattern 4: More generic pattern
      const genericPattern = />([0-9.,]+)\s*(?:Bangladeshi\s*)?(?:taka|BDT)/i;
      const genericMatch = html.match(genericPattern);

      if (genericMatch && genericMatch[1]) {
        const rate = parseFloat(genericMatch[1].replace(',', ''));
        // Sanity check - exchange rates should be reasonable
        if (rate > 0 && rate < 10000) {
          console.log(`✅ Google exchange rate found (pattern 4): 1 ${fromCurrency} = ${rate} ${toCurrency}`);
          return rate;
        }
      }

      console.warn(`⚠️ No exchange rate found in Google response on attempt ${attempt}/${maxRetries}`);

      if (attempt === maxRetries) {
        throw new Error('Could not extract exchange rate from Google response after all attempts');
      }

      // Wait before retrying
      const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      console.log(`⏳ Retrying in ${delayMs}ms...`);
      await sleep(delayMs);

    } catch (error) {
      console.error(`❌ Error on attempt ${attempt}/${maxRetries}:`, error);

      if (attempt === maxRetries) {
        throw error;
      }

      // Wait before retrying
      const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      console.log(`⏳ Retrying in ${delayMs}ms...`);
      await sleep(delayMs);
    }
  }

  throw new Error(`Failed to get exchange rate after ${maxRetries} attempts`);
}

interface ExchangeRates {
  USD: number;
  CAD: number;
  GBP: number;
  AUD: number;
}

let ratesCache: { rates: ExchangeRates; timestamp: number } | null = null;

// Original exchange rate API function (now used as fallback)
async function getExchangeRatesFromAPI(): Promise<ExchangeRates> {
  const response = await fetch(
    `https://api.exchangeratesapi.io/v1/latest?access_key=${EXCHANGE_API_KEY}&base=EUR&symbols=USD,CAD,GBP,AUD,BDT`
  );

  if (!response.ok) {
    throw new Error(`Exchange rate API failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`Exchange rate API error: ${data.error.info}`);
  }

  // Convert rates to BDT (since API uses EUR as base)
  const eurToBdt = data.rates.BDT;
  const rates: ExchangeRates = {
    USD: eurToBdt / data.rates.USD,
    CAD: eurToBdt / data.rates.CAD,
    GBP: eurToBdt / data.rates.GBP,
    AUD: eurToBdt / data.rates.AUD,
  };

  console.log('💱 [EXCHANGE RATE API] Rates retrieved:', rates);
  return rates;
}

// Individual rate cache for on-demand fetching
let individualRatesCache: Map<string, { rate: number; timestamp: number }> = new Map();

export async function getExchangeRate(currency: keyof ExchangeRates): Promise<number> {
  const now = Date.now();
  const cacheKey = currency;

  // Check individual rate cache
  const cached = individualRatesCache.get(cacheKey);
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    console.log(`📦 Using cached ${currency} to BDT rate: ${cached.rate}`);
    return cached.rate;
  }

  let rate: number;
  let source: string = '';

  try {
    // Try Google conversion first
    console.log(`🔍 Fetching ${currency} to BDT rate from Google...`);
    rate = await getGoogleExchangeRate(currency, 'BDT');
    source = 'GOOGLE';
    console.log(`✅ [GOOGLE] ${currency} to BDT rate: ${rate}`);
  } catch (googleError) {
    // Fallback to Exchange Rate API
    console.warn(`⚠️ Google conversion failed for ${currency}, falling back to Exchange Rate API:`, googleError);

    try {
      const rates = await getExchangeRatesFromAPI();
      rate = rates[currency];
      source = 'EXCHANGE_RATE_API';
      console.log(`💱 [EXCHANGE_RATE_API] ${currency} to BDT rate: ${rate}`);
    } catch (apiError) {
      console.error(`❌ Both Google and Exchange Rate API failed for ${currency}:`, apiError);
      throw new Error(`Unable to fetch ${currency} exchange rate from any source`);
    }
  }

  // Cache the individual rate
  individualRatesCache.set(cacheKey, { rate, timestamp: now });
  console.log(`📊 ${currency} rate updated from ${source}: ${rate}`);

  return rate;
}

export async function getExchangeRates(): Promise<ExchangeRates> {
  const now = Date.now();

  // Return cached rates if still fresh
  if (ratesCache && (now - ratesCache.timestamp) < CACHE_DURATION) {
    console.log('📦 Using cached exchange rates');
    return ratesCache.rates;
  }

  // For backward compatibility, fetch all rates but individually
  // This allows other parts of the code to work while being less efficient
  console.log('⚠️ Fetching all rates - consider using getExchangeRate() for single currency');

  const rates: ExchangeRates = {
    USD: await getExchangeRate('USD'),
    CAD: await getExchangeRate('CAD'),
    GBP: await getExchangeRate('GBP'),
    AUD: await getExchangeRate('AUD'),
  };

  // Cache all rates
  ratesCache = { rates, timestamp: now };

  return rates;
}

export async function convertToBdt(amount: number, fromCurrency: keyof ExchangeRates): Promise<number> {
  // Use optimized single-currency fetching
  const rate = await getExchangeRate(fromCurrency);
  return Math.round((amount * rate) * 100) / 100;
}

export function formatBdtPrice(bdtPrice: number): string {
  if (typeof bdtPrice !== 'number' || isNaN(bdtPrice)) {
    console.warn('⚠️ formatBdtPrice received invalid value:', bdtPrice);
    return '৳0';
  }
  return `৳${bdtPrice.toLocaleString('en-BD')}`;
}

export function formatPriceWithOriginal(bdtPrice: number, originalPrice: number, originalCurrency: string): string {
  return `৳${bdtPrice.toLocaleString('en-BD')} ($${originalPrice.toFixed(2)} ${originalCurrency})`;
}

export function parsePriceFromScrapedText(priceText: string): number {
  if (!priceText || typeof priceText !== 'string') return 0;

  // Remove currency symbols and other non-numeric chars, but keep decimal points
  const cleanPrice = priceText.replace(/[৳$£€¥₹¢₽₩₪₴₨C\s,]/g, '').replace(/[^0-9.]/g, '');
  return parseFloat(cleanPrice) || 0;
}

export function extractPriceWithAdvancedPatterns(pageContent: string, currency: string = 'USD'): { price: number; confidence: number } {
  if (!pageContent) return { price: 0, confidence: 0 };

  const results: { price: number; confidence: number }[] = [];

  // Currency symbol mapping
  const currencySymbols = {
    'USD': ['$', 'USD', '\\$'],
    'GBP': ['£', 'GBP', '\\£'],
    'EUR': ['€', 'EUR', '\\€'],
    'CAD': ['C\\$', 'CAD'],
    'AUD': ['A\\$', 'AUD'],
    'BDT': ['৳', 'BDT', 'Tk', 'Taka']
  };

  const symbols = currencySymbols[currency as keyof typeof currencySymbols] || currencySymbols.USD;

  // High confidence patterns (specific e-commerce patterns)
  const highConfidencePatterns = [
    // Price with currency symbol before: $19.99, £25.50
    new RegExp(`(?:${symbols.join('|')})\\s*([0-9]{1,6}(?:,[0-9]{3})*(?:\\.[0-9]{2})?)`, 'gi'),
    // Price with currency after: 19.99 USD, 25.50 GBP
    new RegExp(`([0-9]{1,6}(?:,[0-9]{3})*(?:\\.[0-9]{2})?)\\s*(?:${symbols.join('|')})`, 'gi'),
    // Price in quotes or spans: "$19.99", "25.50 USD"
    new RegExp(`["'](?:${symbols.join('|')})\\s*([0-9]{1,6}(?:,[0-9]{3})*(?:\\.[0-9]{2})?)["']`, 'gi'),
    new RegExp(`["']([0-9]{1,6}(?:,[0-9]{3})*(?:\\.[0-9]{2})?)\\s*(?:${symbols.join('|')})["']`, 'gi')
  ];

  // Medium confidence patterns
  const mediumConfidencePatterns = [
    // Price: $19.99, Cost: $25.00
    new RegExp(`(?:price|cost|amount|total|subtotal)\\s*[:\-]?\\s*(?:${symbols.join('|')})\\s*([0-9]{1,6}(?:,[0-9]{3})*(?:\\.[0-9]{2})?)`, 'gi'),
    // $19.99 each, $25.00 per item
    new RegExp(`(?:${symbols.join('|')})\\s*([0-9]{1,6}(?:,[0-9]{3})*(?:\\.[0-9]{2})?)\\s*(?:each|per|ea\\.|/ea)`, 'gi')
  ];

  // Low confidence patterns (basic number detection)
  const lowConfidencePatterns = [
    // Any currency symbol followed by numbers
    new RegExp(`(?:${symbols.join('|')})\\s*([0-9]{1,4}(?:,[0-9]{3})*(?:\\.[0-9]{2})?)`, 'gi')
  ];

  // Process high confidence patterns
  highConfidencePatterns.forEach(pattern => {
    const matches = [...pageContent.matchAll(pattern)];
    matches.forEach(match => {
      const priceStr = match[1];
      if (priceStr) {
        const price = parsePriceFromScrapedText(priceStr);
        if (price > 0 && price < 1000000) { // Reasonable price range
          results.push({ price, confidence: 0.9 });
        }
      }
    });
  });

  // If no high confidence results, try medium confidence
  if (results.length === 0) {
    mediumConfidencePatterns.forEach(pattern => {
      const matches = [...pageContent.matchAll(pattern)];
      matches.forEach(match => {
        const priceStr = match[1];
        if (priceStr) {
          const price = parsePriceFromScrapedText(priceStr);
          if (price > 0 && price < 1000000) {
            results.push({ price, confidence: 0.6 });
          }
        }
      });
    });
  }

  // If still no results, try low confidence
  if (results.length === 0) {
    lowConfidencePatterns.forEach(pattern => {
      const matches = [...pageContent.matchAll(pattern)];
      matches.forEach(match => {
        const priceStr = match[1];
        if (priceStr) {
          const price = parsePriceFromScrapedText(priceStr);
          if (price > 0 && price < 1000000) {
            results.push({ price, confidence: 0.3 });
          }
        }
      });
    });
  }

  if (results.length === 0) {
    return { price: 0, confidence: 0 };
  }

  // Return the result with highest confidence, or most common price if tied
  const sortedResults = results.sort((a, b) => b.confidence - a.confidence);
  return sortedResults[0];
}

export function validatePrice(price: number, currency: string = 'USD'): { isValid: boolean; reason?: string } {
  if (typeof price !== 'number' || isNaN(price)) {
    return { isValid: false, reason: 'Invalid number' };
  }

  if (price < 0) {
    return { isValid: false, reason: 'Negative price' };
  }

  if (price === 0) {
    return { isValid: true }; // 0 is valid for free products
  }

  // Currency-specific validation ranges
  const priceRanges = {
    'USD': { min: 0.01, max: 100000 },
    'GBP': { min: 0.01, max: 80000 },
    'EUR': { min: 0.01, max: 90000 },
    'CAD': { min: 0.01, max: 130000 },
    'AUD': { min: 0.01, max: 150000 },
    'BDT': { min: 1, max: 10000000 }
  };

  const range = priceRanges[currency as keyof typeof priceRanges] || priceRanges.USD;

  if (price < range.min) {
    return { isValid: false, reason: `Price too low (min: ${range.min} ${currency})` };
  }

  if (price > range.max) {
    return { isValid: false, reason: `Price too high (max: ${range.max} ${currency})` };
  }

  return { isValid: true };
}

export function detectCurrency(priceText: string): keyof ExchangeRates | 'BDT' {
  if (priceText.includes('৳') || priceText.includes('BDT') || priceText.includes('Tk')) return 'BDT';
  if (priceText.includes('$') || priceText.includes('USD')) return 'USD';
  if (priceText.includes('£') || priceText.includes('GBP')) return 'GBP';
  if (priceText.includes('C$') || priceText.includes('CAD')) return 'CAD';
  if (priceText.includes('A$') || priceText.includes('AUD')) return 'AUD';
  return 'USD'; // Most common for US stores
}

export function isBdtPrice(priceText: string): boolean {
  return detectCurrency(priceText) === 'BDT';
}

// Export the Google exchange rate function for testing
export { getGoogleExchangeRate };

// Test function to verify Google currency conversion is working
export async function testGoogleCurrencyConversion(): Promise<void> {
  console.log('🧪 Testing Google currency conversion via Scraper API...\n');

  const currencies = ['USD', 'CAD', 'GBP', 'AUD'];

  for (const currency of currencies) {
    try {
      console.log(`Testing ${currency} to BDT conversion...`);
      const rate = await getGoogleExchangeRate(currency, 'BDT');
      console.log(`✅ Success: 1 ${currency} = ${rate} BDT\n`);
    } catch (error) {
      console.error(`❌ Failed to get ${currency} to BDT rate:`, error);
      console.log('');
    }
  }

  console.log('🧪 Test complete!');
}