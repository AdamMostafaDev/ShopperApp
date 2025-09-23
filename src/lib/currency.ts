// Real-time currency conversion to BDT using exchangeratesapi.io

const EXCHANGE_API_KEY = 'e7cd555c08dcb78c0280a29dc308f453';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour cache

// Google currency conversion using Scraper API
async function getGoogleExchangeRate(fromCurrency: string, toCurrency: string = 'BDT'): Promise<number> {
  try {
    const scraperApiKey = process.env.SCRAPER_API_KEY;
    if (!scraperApiKey) {
      throw new Error('SCRAPER_API_KEY environment variable is not set');
    }

    // Construct Google search query for currency conversion
    const query = `1 ${fromCurrency} to ${toCurrency}`;
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

    // Use Scraper API to fetch Google results
    const scraperUrl = `http://api.scraperapi.com?api_key=${scraperApiKey}&url=${encodeURIComponent(googleUrl)}`;

    console.log(`Fetching Google exchange rate: ${fromCurrency} to ${toCurrency}`);

    const response = await fetch(scraperUrl);

    if (!response.ok) {
      throw new Error(`Scraper API request failed: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

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

    throw new Error('Could not extract exchange rate from Google response');

  } catch (error) {
    console.error('Error fetching Google exchange rate:', error);
    throw error;
  }
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
  const cleanPrice = priceText.replace(/[৳$£€,]/g, '').replace(/[^0-9.]/g, '');
  return parseFloat(cleanPrice) || 0;
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