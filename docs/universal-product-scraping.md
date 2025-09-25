# Universal Product Scraping Architecture

## Overview
Documentation of the universal product scraping system for UniShopper - handling both partner stores (Amazon) and non-partner stores (Nike, Best Buy, etc.).

## Architecture Pattern

### Backend Structure (`/api/capture-product/route.ts`)

**Store Detection & Routing:**
```
URL Input → detectStore() → Route to appropriate scraper
├── Amazon/Walmart/eBay → Specific scrapers (trusted, no approval)
└── Other stores → Universal scraper (requires approval)
```

**Product Flow:**
```javascript
if (result.product.requiresApproval) {
  // Non-Amazon products → productsForReview array
} else {
  // Amazon products → capturedProducts array
}
```

### Scraper Implementation Status

**✅ Correctly Implemented:**
- **`scrapeAmazonWithScraperAPI()`** - Amazon-specific selectors (`.a-price`, `#productTitle`)
- **`scrapeUniversalWithScraperAPI()`** - Generic patterns only
- **`scrapeUniversalFallback()`** - Generic patterns only

**❌ Not Implemented:**
- Walmart scraper (returns 501)
- eBay scraper (returns 501)

### Universal Scraper Patterns (Generic Only)

**✅ Proper Generic Selectors Used:**

**Title Extraction:**
```javascript
// 1. Standards-based (highest priority)
'meta[property="og:title"]'     // OpenGraph
'meta[name="twitter:title"]'    // Twitter Cards
'[itemprop="name"]'            // Schema.org

// 2. Generic fallbacks
'h1'                           // Standard heading
'.product-title', '.product-name' // Generic classes
```

**Price Extraction:**
```javascript
// 1. Meta tags (90% confidence)
'meta[property="product:price:amount"]'
'meta[property="og:price:amount"]'

// 2. JSON-LD structured data (85% confidence)
script[type="application/ld+json"] → @type: Product

// 3. Generic selectors (70% confidence)
'[itemprop="price"]'           // Schema.org standard
'.price:not(.old-price)'       // Generic price class
'.product-price', '.current-price' // Common patterns
```

**Image Extraction:**
```javascript
// 1. Meta tags (highest priority)
'meta[property="og:image"]'
'meta[name="twitter:image"]'

// 2. Generic selectors
'[itemprop="image"]'
'.product-image img', '.product-photo img'
```

### UI Architecture (`/src/app/(main)/page.tsx`)

**State Management:**
```javascript
const [capturedProducts, setCapturedProducts] = useState<Product[]>([]);     // Amazon
const [productsForReview, setProductsForReview] = useState<Product[]>([]);  // Others
const [searchResults, setSearchResults] = useState<Product[]>([]);          // Search
```

**Component Mapping:**
```
Amazon Products → ProductCard (compact, auto-approved)
Other Products → ProductPreview (compact, requires approval + edit modal)
```

**Display Issue Identified:**
- **Problem:** Two separate grid containers cause vertical stacking
- **Solution:** Need single grid combining all product types

## Key Findings

### ✅ Architecture is Clean
- **No contamination:** Amazon selectors properly isolated to Amazon functions
- **Universal scraper:** Uses only generic web standards
- **Separation maintained:** Each scraper handles its domain correctly

### ❌ UI Layout Issue
- Products stack vertically due to separate grids
- Nike (review) and Amazon (captured) appear in different containers
- Need unified grid for horizontal display

### 🔄 Confidence System
- Meta tags: 90% confidence
- JSON-LD: 85% confidence
- CSS selectors: 70% confidence
- Advanced patterns: 30-60% confidence
- **Status:** Removed from UI per user request

## Recommendations

### Backend (No Changes Needed)
- ✅ Universal scraper already uses proper generic patterns
- ✅ Amazon scraper properly isolated
- 🔄 Add Walmart/eBay specific scrapers when needed

### Frontend (Needs Fix)
- ❌ Combine `productsForReview` and `capturedProducts` into single grid
- ✅ ProductPreview component updated to compact card design
- ✅ Confidence indicators removed from UI

### Future Enhancements
- Add store-specific scrapers (Target, Best Buy) vs improving universal
- Universal scraper should remain generic for broad compatibility
- Store-specific scrapers for optimized extraction when volume justifies

## Implementation Notes

**Generic Pattern Priority:**
1. **Web Standards** (OpenGraph, Schema.org, JSON-LD)
2. **Common CSS Patterns** (.price, .product-title)
3. **Semantic HTML** (h1, img[alt*="product"])
4. **Modern Patterns** ([data-testid], [aria-label])

**Store-Specific Priority:**
1. **Structured API** (ScraperAPI product endpoints)
2. **CSS Selectors** (site-specific classes/IDs)
3. **Dynamic Content** (JavaScript-rendered elements)
4. **Fallback Patterns** (generic selectors as backup)

---
*Last Updated: 2025-09-24*
*Status: Architecture verified, UI layout fix pending*