# Manual Product Implementation Documentation

## Overview
This document outlines the implementation of manual product entry flow for UniShopper, allowing users to instantly add products from non-supported stores without waiting for scraping or team processing.

## Context & Business Case

### Problem Statement
- Universal scraping is expensive (~$0.05 per request) and slow (60-80 seconds)
- Many stores don't need full scraping - users can provide basic details quickly
- Current system forces users to wait for scraping even when they know product details
- Cart system needs to handle products from any store worldwide

### Solution: Instant Manual Entry
Instead of expensive/slow scraping for non-supported stores, allow users to:
1. Submit URL instantly (no scraping costs)
2. Add basic product details (title, price) themselves
3. Use extracted store logos/names for visual consistency
4. Add to cart immediately with same UI patterns

## Store Classification Strategy

### Three-Tier System
```javascript
const getStoreStrategy = (url) => {
  if (isAmazon(url)) return 'specific_scraper';     // Prime Partner - Instant
  if (isTopStore(url)) return 'universal_scraper';  // Supported - 30-60s
  return 'manual_entry';                            // Others - Instant manual
}

const topStores = ['nike.com', 'target.com', 'walmart.com', 'ebay.com'];
```

### Store Processing Methods
1. **Prime Partners (Amazon):** ScraperAPI specific endpoints, complete automation
2. **Supported Stores (Nike, Target, etc.):** Universal scraper with fallback to manual
3. **Manual Entry Stores:** Instant UI flow, user provides details, no scraping

## Manual Entry User Flow

### Step 1: URL Detection
```javascript
// User submits non-supported store URL
const result = {
  strategy: 'manual_entry',
  storeName: extractStoreFromUrl(url), // "Carter's", "Newegg", etc.
  storeImage: getStoreLogo(storeName) || null,
  requiresManualEntry: true
}
```

### Step 2: Immediate UI Response
- Show message: "We've captured your URL from [StoreName]"
- Display: "This isn't a prime integration partner, but you can add it manually"
- Present form: Product title, price (USD/BDT), confirm button
- Visual: Store logo if available, store name otherwise

### Step 3: Manual Product Creation
```javascript
const manualProduct = {
  id: generateId(),
  type: 'manual_entry',
  originalUrl: url,
  title: userProvidedTitle,
  price: convertToBdt(userPrice),
  priceInBdt: true,
  originalPriceValue: userPrice,
  originalCurrency: userSelectedCurrency,
  image: storeLogo || generateStoreNameImage(storeName),
  storeName: extractedStoreName,
  store: 'other',
  requiresApproval: true,
  status: 'manual_complete',

  // Cart system compatibility
  weight: null, // Will need estimation for shipping
  sourcingMethod: 'user_managed',
  estimatedShippingDays: '14-21 days',
  isManualEntry: true
}
```

## UI Implementation Requirements

### Visual Consistency
- Follow same ProductPreview component patterns used for universal scraping
- Same badge system: Green (Amazon), Orange (Supported), Blue (Manual Entry)
- Same grid layout and card design
- Consistent approval flow and editing capabilities

### Store Logo/Image Handling
```javascript
const getManualProductImage = (storeName, url) => {
  // Priority 1: Store logo from existing mapping
  const logo = getStoreLogo(storeName);
  if (logo) return logo;

  // Priority 2: Try extracting from URL (simple attempt)
  const extractedImage = tryBasicImageExtraction(url);
  if (extractedImage) return extractedImage;

  // Priority 3: Generate text-based store image
  return generateStoreNameImage(storeName); // "Carter's", "Newegg" text
}
```

### Loading States & Messaging
- **Current Issue:** Loading shows "Searching Amazon products" for all stores
- **Fix Required:** Dynamic messaging based on store strategy
  ```javascript
  const getLoadingMessage = (strategy, storeName) => {
    switch(strategy) {
      case 'specific_scraper': return 'Processing Prime Partner...';
      case 'universal_scraper': return `Analyzing ${storeName}...`;
      case 'manual_entry': return `Setting up manual entry for ${storeName}...`;
    }
  }
  ```

### Form Validation
```javascript
const validateManualProduct = (product) => {
  const errors = [];

  if (!product.title?.trim()) errors.push('Product title required');
  if (!product.price || product.price <= 0) errors.push('Valid price required (must be > 0)');
  if (product.price > 100000) errors.push('Price too high');

  return { isValid: errors.length === 0, errors };
}
```

## Cart System Integration

### Product Type Handling
```javascript
// Enhanced cart item structure
interface CartItem {
  // Standard fields
  id: string;
  title: string;
  price: number;
  image: string;

  // Source identification
  type: 'amazon' | 'scraped' | 'manual_entry';
  store: string;
  storeName: string;

  // Manual entry specific
  isManualEntry?: boolean;
  originalUrl?: string;
  sourcingMethod?: 'automated' | 'user_managed';

  // Shipping considerations
  weight?: number | null;
  estimatedWeight?: string; // "Standard package" for manual items
  shippingEstimate?: string; // "14-21 days" for manual
}
```

### Checkout Flow Modifications
```javascript
const calculateShipping = (cartItems) => {
  const manualItems = cartItems.filter(item => item.type === 'manual_entry');
  const automatedItems = cartItems.filter(item => item.type !== 'manual_entry');

  return {
    automatedShipping: calculatePreciseShipping(automatedItems),
    manualShipping: estimateManualShipping(manualItems),
    totalEstimate: combinedEstimate,
    hasManualItems: manualItems.length > 0,
    shippingDisclaimer: "Manual items may require additional shipping time"
  }
}
```

## Backend API Changes

### Enhanced Store Detection
```javascript
// In /api/capture-product/route.ts
const processProductUrl = async (url) => {
  const strategy = getStoreStrategy(url);

  switch(strategy) {
    case 'specific_scraper':
      return await scrapeAmazonWithScraperAPI(url);

    case 'universal_scraper':
      return await scrapeUniversalWithScraperAPI(url);

    case 'manual_entry':
      return await createManualEntryPrompt(url);
  }
}

const createManualEntryPrompt = async (url) => {
  const storeName = extractStoreFromUrl(url);
  const storeImage = getStoreLogo(storeName);

  return {
    success: true,
    requiresManualEntry: true,
    storeName,
    storeImage,
    originalUrl: url,
    message: `Ready for manual entry from ${storeName}`
  };
}
```

### Manual Product Creation Endpoint
```javascript
// New endpoint: /api/create-manual-product
const createManualProduct = async (req) => {
  const { url, title, price, currency, storeName } = req.body;

  // Validation
  const validation = validateManualProduct({ title, price });
  if (!validation.isValid) {
    return { success: false, errors: validation.errors };
  }

  // Convert price to BDT
  const priceInBdt = await convertToBdt(price, currency);

  // Create product
  const product = {
    id: generateId(),
    type: 'manual_entry',
    title: title.trim(),
    price: priceInBdt,
    originalPriceValue: price,
    originalCurrency: currency,
    image: getManualProductImage(storeName, url),
    originalUrl: url,
    storeName,
    store: 'other',
    requiresApproval: true,
    createdAt: new Date(),
    isManualEntry: true
  };

  return { success: true, product };
}
```

## User Experience Flow

### Complete User Journey
1. **URL Submission:** User pastes non-supported store URL
2. **Instant Detection:** System recognizes it's not Amazon/supported store
3. **Friendly Message:** "We've captured your URL from [StoreName]. Since this isn't a prime integration partner, you can add the details manually - it's faster!"
4. **Manual Form:** Simple form with title, price, currency selection
5. **Visual Preview:** Show store logo/name, user can see how it will appear
6. **Validation:** Ensure price > 0, title provided
7. **Cart Addition:** Product added to same unified grid with blue "Manual Entry" badge
8. **Approval Flow:** Same approval process as other non-Amazon products
9. **Checkout:** Clear indication of manual items and estimated shipping

### Error Handling
```javascript
const handleManualEntryErrors = (error) => {
  const errorMessages = {
    'PRICE_ZERO': 'Product price cannot be zero',
    'PRICE_TOO_HIGH': 'Price exceeds maximum allowed ($100,000)',
    'MISSING_TITLE': 'Product title is required',
    'INVALID_URL': 'Please provide a valid product URL',
    'STORE_BLOCKED': 'This store is temporarily unavailable for manual entry'
  };

  return errorMessages[error.code] || 'An error occurred during manual entry';
}
```

## Performance & Cost Benefits

### Cost Comparison
- **Universal Scraping:** $0.05 per request + 60-80 seconds
- **Manual Entry:** $0.00 scraping cost + 30 seconds user time
- **Projected Savings:** 90%+ cost reduction for non-supported stores

### Speed Comparison
- **Universal Scraping:** 60-80 seconds average
- **Manual Entry:** 15-30 seconds (user-dependent)
- **User Experience:** Immediate control vs waiting for scraping

### Success Rate
- **Universal Scraping:** ~85% success rate (missing data common)
- **Manual Entry:** 100% completion rate (user provides all needed data)

## Implementation Priority

### Phase 1: Core Manual Entry
1. Store classification system (2.1)
2. Enhanced loading messages (2.2)
3. Manual entry UI flow (2.3)
4. Price validation (2.3)

### Phase 2: Admin & Migration
1. Admin dashboard integration (2.4)
2. A/B testing framework (2.5)
3. Performance monitoring
4. Gradual store migration from universal to custom scrapers

## Technical Considerations

### Database Schema Updates
```sql
-- Add to products table
ALTER TABLE products ADD COLUMN type VARCHAR(20) DEFAULT 'amazon';
ALTER TABLE products ADD COLUMN is_manual_entry BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN original_url TEXT;
ALTER TABLE products ADD COLUMN sourcing_method VARCHAR(20) DEFAULT 'automated';
ALTER TABLE products ADD COLUMN estimated_shipping_days VARCHAR(10);
```

### Frontend State Management
```javascript
// Enhanced product state structure
const [products, setProducts] = useState({
  amazon: [],           // Prime partners (green badges)
  supported: [],        // Universal scraping (orange badges)
  manual: [],          // Manual entry (blue badges)
  search: []           // Search results
});

// Single grid rendering
const allProducts = [...products.manual, ...products.supported, ...products.amazon, ...products.search];
```

## Success Metrics

### User Experience Metrics
- Manual entry completion rate > 95%
- Time to cart addition < 30 seconds
- User satisfaction with manual flow > 4.5/5

### Business Metrics
- Scraping cost reduction > 80%
- Support ticket reduction for "slow scraping"
- Cart abandonment rate maintenance or improvement

### Technical Metrics
- API response time for manual flow < 2 seconds
- Price validation accuracy 100%
- Store name extraction accuracy > 90%

---

**Purpose:** This document provides Claude Code with complete context for implementing manual product entry flow, understanding the business reasoning, technical requirements, and user experience expectations for the feature.

**Last Updated:** 2025-09-24
**Status:** Planning phase - Implementation pending