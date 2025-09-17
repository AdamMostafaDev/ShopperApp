import { NextResponse } from 'next/server';
import { sendOrderConfirmationEmail } from '@/lib/klaviyo';

export async function POST() {
  try {
    console.log('🧪 Testing email with fixed Klaviyo API structure...');
    
    const testOrderData = {
      orderId: '999',
      orderNumber: '100999',
      customerEmail: 'adnanmostafapro@gmail.com',
      customerName: 'Test User',
      items: [{
        id: 'test-123',
        title: 'Test Product',
        price: 100,
        originalPriceValue: 1,
        quantity: 1,
        image: 'https://via.placeholder.com/100',
        url: '#',
        store: 'test'
      }],
      subtotalBdt: 100,
      serviceChargeBdt: 5,
      taxBdt: 9,
      totalAmountBdt: 114,
      subtotalUsd: 1,
      serviceChargeUsd: 0.05,
      taxUsd: 0.09,
      totalAmountUsd: 1.14,
      exchangeRate: 121.17,
      currency: 'BDT',
      orderDate: new Date().toISOString()
    };

    const result = await sendOrderConfirmationEmail(testOrderData);
    
    return NextResponse.json({
      success: true,
      result,
      message: 'Email test completed with fixed Klaviyo API structure'
    });
  } catch (error) {
    console.error('Email test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}