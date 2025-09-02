// Shipping cost and service charge calculations for Bangladesh

const SHIPPING_RATE_PER_KG = 2500; // ৳2500 per kg
const SERVICE_CHARGE_RATE = 0.05; // 5%
const TAX_RATE = 0.08875; // 8.875%

export function calculateShippingCost(weightKg?: number): number {
  console.log('🚚 calculateShippingCost called - shipping disabled, returning 0');
  return 0; // No shipping costs
}

export function calculateServiceCharge(productCost: number): number {
  return Math.round(productCost * SERVICE_CHARGE_RATE);
}

export function calculateTax(subtotal: number): number {
  return Math.round(subtotal * TAX_RATE);
}

export function calculateCartTotals(items: Array<{price: number, quantity: number, weight?: number}>) {
  console.log('🛒 calculateCartTotals called with items:', items.length);
  
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // No shipping calculations needed
  const shippingCost = 0;
  const serviceCharge = calculateServiceCharge(subtotal);
  const tax = calculateTax(subtotal);
  const total = subtotal + shippingCost + serviceCharge + tax;
  
  const result = {
    subtotal,
    shippingCost,
    serviceCharge,
    tax,
    total,
    totalWeight: 0 // No weight tracking needed
  };
  
  console.log(`💰 Cart totals: Subtotal ৳${subtotal}, Shipping ৳${shippingCost}, Service ৳${serviceCharge}, Tax ৳${tax}, Total ৳${total}`);
  console.log('📋 Returning totals object:', result);
  
  return result;
}