/**
 * Display utilities for formatting order data
 */

/**
 * Display shipping cost with TBD logic
 * Shows "TBD" when amount is 0, otherwise formats the amount
 */
export const displayShipping = (amount: number | null | undefined, currency: 'BDT' | 'USD' = 'BDT'): string => {
  if (!amount || amount === 0) {
    return 'TBD';
  }

  if (currency === 'BDT') {
    return `৳${amount.toLocaleString()}`;
  } else {
    return `$${amount.toLocaleString()}`;
  }
};

/**
 * Display any amount with proper currency formatting
 */
export const displayAmount = (amount: number | null | undefined, currency: 'BDT' | 'USD' = 'BDT'): string => {
  if (amount === null || amount === undefined) {
    return 'N/A';
  }

  if (currency === 'BDT') {
    return `৳${amount.toLocaleString()}`;
  } else {
    return `$${amount.toLocaleString()}`;
  }
};

/**
 * Check if order has final pricing updates
 */
export const hasFinalPricing = (order: any): boolean => {
  return order.finalPricingUpdated === true;
};

/**
 * Get display amounts - show final if updated, otherwise original
 */
export const getDisplayAmounts = (order: any) => {
  const useFinal = hasFinalPricing(order);

  // Calculate product cost from finalItems if available, otherwise use finalProductCostBdt
  let productCostBdt = order.productCostBdt;
  if (useFinal) {
    if (order.finalItems && order.finalItems.length > 0) {
      // Calculate from individual items
      productCostBdt = order.finalItems.reduce((sum: number, item: any) =>
        sum + (item.finalPriceBdt * item.quantity), 0);
    } else {
      // Fallback to the old finalProductCostBdt field
      productCostBdt = order.finalProductCostBdt || order.productCostBdt;
    }
  }

  return {
    productCostBdt,
    serviceChargeBdt: useFinal ? (order.finalServiceChargeBdt || order.serviceChargeBdt) : order.serviceChargeBdt,
    shippingCostBdt: useFinal ? (order.finalShippingCostBdt || order.shippingCostBdt) : order.shippingCostBdt,
    taxBdt: useFinal ? (order.finalTaxBdt || order.taxBdt) : order.taxBdt,
    totalAmountBdt: useFinal ? (order.finalTotalAmountBdt || order.totalAmountBdt) : order.totalAmountBdt,
    // Shipping breakdown fields
    finalShippingOnlyBdt: useFinal ? order.finalShippingOnlyBdt : null,
    finalAdditionalFeesBdt: useFinal ? order.finalAdditionalFeesBdt : null,
    feeDescription: useFinal ? order.feeDescription : null,
    isUpdated: useFinal
  };
};

/**
 * Get updated item prices using finalItems if available
 */
export const getUpdatedItemPrices = (order: any) => {
  if (!order.items) {
    return [];
  }

  const hasUpdatedPricing = hasFinalPricing(order);

  // If we have finalItems (individual pricing), use those
  if (hasUpdatedPricing && order.finalItems) {
    return order.items.map((item: any, index: number) => {
      const finalItem = order.finalItems.find((fItem: any) =>
        fItem.id === (item.id || item.product?.id)
      ) || order.finalItems[index];

      if (finalItem) {
        return {
          ...item,
          price: finalItem.finalPriceBdt,
          priceUpdated: true,
          originalPrice: item.price, // Store original for comparison
        };
      }

      return {
        ...item,
        priceUpdated: hasUpdatedPricing
      };
    });
  }

  // Fallback to original pricing
  return order.items.map((item: any) => ({
    ...item,
    priceUpdated: hasUpdatedPricing
  }));
};