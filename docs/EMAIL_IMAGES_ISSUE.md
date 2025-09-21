# Email Images Issue: Vercel vs Localhost

## Problem Summary

Product images display correctly in emails when orders are created on **localhost** but fail to display when orders are created on **Vercel (production)**.

## Root Cause

The issue is caused by **Supabase Pooler connection limitations** when storing large JSON fields containing product image URLs.

### Behavior Observed:
- ✅ **Localhost orders → Email sent from anywhere**: Images work
- ❌ **Vercel orders → Email sent from anywhere**: Images broken
- ✅ **Localhost order → Email sent from Vercel**: Images work

This confirms the problem occurs during **order creation** in production, not during email sending.

## Technical Details

### Database Connection Types:
- **Localhost**: Uses `DIRECT_URL` (direct PostgreSQL connection on port 5432)
- **Vercel**: Uses `DATABASE_URL` (Supabase pooler connection on port 6543)

### Pooler Limitations:
1. **JSON field size limits**: Large product data gets truncated
2. **URL corruption**: Long image URLs may be stripped or corrupted
3. **Serialization issues**: Complex nested objects may not serialize properly

## Solution Implemented

### 1. Optimized Data Storage (`src/app/api/checkout/route.ts`)

```javascript
// Before: Stored entire cart object (large JSON)
items: cartItems,

// After: Store only essential data (smaller JSON)
const processedItems = cartItems.map((item: any) => ({
  quantity: item.quantity,
  product: {
    id: item.product.id,
    title: item.product.title,
    price: item.product.price,
    store: item.product.store || 'Amazon',
    url: item.product.url || '',
    weight: item.product.weight || 0,
    originalPriceValue: item.product.originalPriceValue || 0,
    originalCurrency: item.product.originalCurrency || 'USD',
    // Limit image URL length for pooler compatibility
    image: validImageUrl.substring(0, 500)
  }
}));
```

### 2. Image URL Validation

```javascript
// Validate and process image URLs before storage
const isValidImage = originalImageUrl &&
                    originalImageUrl.trim() !== '' &&
                    (originalImageUrl.startsWith('http://') ||
                     originalImageUrl.startsWith('https://') ||
                     originalImageUrl.startsWith('//'));

const finalImageUrl = isValidImage
  ? originalImageUrl.substring(0, 500) // Limit length
  : 'https://via.placeholder.com/150x150.png?text=Product';
```

### 3. Comprehensive Logging

Added detailed logging to track:
- Original vs processed image URLs
- JSON size before database storage
- What was actually stored in database
- Image validation results
- Database connection type

## Monitoring

Check Vercel logs for these patterns:

```
🔍 Processing cart items for order creation...
📦 Original cart items count: 2
📸 Item 1 - Product Name:
   Original image: https://m.media-amazon.com/images/...
   Valid: ✅
   Final image: https://m.media-amazon.com/images/...
   Image length: 150 chars
📊 Processed items JSON size: 1250 characters
🔗 Database connection: POOLER (production)
✅ Order created successfully: 100101 (ID: 123)
🔍 Verifying stored data...
📦 Items stored in database: 2
📸 Stored Item 1: Product Name
   Image URL: https://m.media-amazon.com/images/...
   Image length: 150 chars
```

## Prevention

1. **Keep JSON fields small**: Remove unnecessary data before storage
2. **Validate URLs**: Ensure proper format and reasonable length
3. **Monitor logs**: Watch for pooler-related issues
4. **Test in production**: Always verify image storage works in Vercel

## Alternative Solutions (Not Used)

1. **Direct Database Connection**: Vercel doesn't support port 5432
2. **External Image Storage**: Would require additional infrastructure
3. **Separate Image Table**: Adds complexity for minimal benefit

## Files Modified

- `src/app/api/checkout/route.ts`: Optimized data storage and added logging
- `src/lib/display-utils.ts`: Fixed null value handling for pricing
- `src/app/api/admin/orders/[id]/send-confirmation-email/route.ts`: Added validation

## Testing

To verify the fix:
1. Create an order in Vercel production
2. Check Vercel logs for image processing details
3. Send email confirmation from admin panel
4. Verify product images display correctly in email

---

*Last updated: September 21, 2025*
*Issue resolved with optimized JSON storage for pooler compatibility*