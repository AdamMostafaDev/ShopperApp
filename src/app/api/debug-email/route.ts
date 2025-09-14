import { NextRequest, NextResponse } from 'next/server';
import { sendOrderConfirmationEmail } from '@/lib/klaviyo';

export async function POST(request: NextRequest) {
  try {
    const testOrderData = {
      orderId: 'DEBUG_' + Date.now(),
      orderNumber: 'DBG-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      customerEmail: 'adnanmostafapro@gmail.com',
      customerName: 'Adnan Mostafa',
      customerPhone: '+880-1234-567890',
      shippingAddress: {
        name: 'Adnan Mostafa',
        line1: '123 Test Street',
        line2: 'Apt 4B',
        city: 'Dhaka',
        state: 'Dhaka Division',
        postal_code: '1000',
        country: 'Bangladesh'
      },
      items: [
        {
          id: 'debug-product-1',
          title: 'Debug Test Product',
          price: 2500, // BDT
          originalPriceValue: 25, // USD
          quantity: 1,
          image: 'https://via.placeholder.com/300x300',
          url: 'https://example.com/product/debug',
          store: 'amazon'
        }
      ],
      subtotalBdt: 2500,
      serviceChargeBdt: 250,
      taxBdt: 0,
      totalAmountBdt: 2750,
      subtotalUsd: 25,
      serviceChargeUsd: 2.5,
      taxUsd: 0,
      totalAmountUsd: 27.5,
      exchangeRate: 100,
      currency: 'BDT',
      orderDate: new Date().toISOString()
    };

    console.log('🔍 DEBUG: Sending test order email with data:', testOrderData);

    const result = await sendOrderConfirmationEmail(testOrderData);

    return NextResponse.json({
      success: true,
      klaviyoResult: result,
      testOrderData: testOrderData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Debug email test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}