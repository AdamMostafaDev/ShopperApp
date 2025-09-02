// Shipping cost and service charge calculations for Bangladesh

const SHIPPING_RATE_PER_KG = 2500; // ৳2500 per kg
const SERVICE_CHARGE_RATE = 0.05; // 5%

export function calculateShippingCost(weightKg?: number): number {
  console.log('🚚 calculateShippingCost called with weight:', weightKg, 'kg');
  
  // Use minimum weight of 1kg if no weight provided
  const actualWeight = weightKg && weightKg > 0 ? weightKg : 1.0;
  
  if (!weightKg || weightKg === 0) {
    console.log('⚠️ No weight provided, using default 1kg for shipping calculation');
  }
  
  const shippingCost = Math.round(actualWeight * SHIPPING_RATE_PER_KG);
  console.log(`💰 Shipping calculation: ${actualWeight}kg × ৳${SHIPPING_RATE_PER_KG} = ৳${shippingCost}`);
  return shippingCost;
}

export function calculateServiceCharge(productCost: number): number {
  return Math.round(productCost * SERVICE_CHARGE_RATE);
}

export function calculateCartTotals(items: Array<{price: number, quantity: number, weight?: number}>) {
  console.log('🛒 calculateCartTotals called with items:', items.length);
  
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Calculate total weight
  const totalWeight = items.reduce((sum, item) => {
    const itemWeight = item.weight || 0;
    const itemTotalWeight = itemWeight * item.quantity;
    console.log(`📦 Item weight: ${itemWeight}kg × quantity ${item.quantity} = ${itemTotalWeight}kg`);
    return sum + itemTotalWeight;
  }, 0);
  
  console.log(`⚖️ Total cart weight: ${totalWeight}kg`);
  
  const shippingCost = calculateShippingCost(totalWeight);
  const serviceCharge = calculateServiceCharge(subtotal);
  const total = subtotal + shippingCost + serviceCharge;
  
  return {
    subtotal,
    shippingCost,
    serviceCharge,
    total,
    totalWeight
  };
}