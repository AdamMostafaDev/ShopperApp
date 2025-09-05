// Real-time currency conversion to BDT using exchangeratesapi.io

const EXCHANGE_API_KEY = 'e7cd555c08dcb78c0280a29dc308f453';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour cache

interface ExchangeRates {
  USD: number;
  CAD: number;
  GBP: number;
  AUD: number;
}

let ratesCache: { rates: ExchangeRates; timestamp: number } | null = null;

export async function getExchangeRates(): Promise<ExchangeRates> {
  const now = Date.now();
  
  // Return cached rates if still fresh
  if (ratesCache && (now - ratesCache.timestamp) < CACHE_DURATION) {
    console.log('Using cached exchange rates');
    return ratesCache.rates;
  }
  
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
  
  // Cache the rates
  ratesCache = { rates, timestamp: now };
  
  console.log('✅ Exchange rates updated:', rates);
  return rates;
}

export async function convertToBdt(amount: number, fromCurrency: keyof ExchangeRates): Promise<number> {
  const rates = await getExchangeRates();
  return Math.round((amount * rates[fromCurrency]) * 100) / 100;
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