import { NextRequest, NextResponse } from 'next/server';
import { sendOrderConfirmationEmail } from '@/lib/klaviyo';

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();
    
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Mock order data for testing
    const mockOrderData = {
      orderId: orderId.toString(),
      orderNumber: `ORD-${Date.now()}`,
      customerEmail: 'test@unishopper.com',
      customerName: 'Test Customer',
      items: [
        {
          id: 'B003OAJGJO',
          title: 'Crock-Pot 7 Quart Oval Manual Slow Cooker, Stainless Steel (SCV700-S-BR)',
          price: 5815.06,
          originalPriceValue: 47.99,
          quantity: 1,
          image: 'https://m.media-amazon.com/images/I/71qcgE5gOcL._AC_SL1500_.jpg',
          url: 'https://www.amazon.com/dp/B003OAJGJO',
          store: 'amazon'
        }
      ],
      subtotalBdt: 5815.06,
      serviceChargeBdt: 290.75,
      taxBdt: 516.09,
      totalAmountBdt: 6621.90,
      subtotalUsd: 47.99,
      serviceChargeUsd: 2.40,
      taxUsd: 4.26,
      totalAmountUsd: 54.65,
      exchangeRate: 121.17,
      currency: 'BDT',
      orderDate: new Date().toISOString()
    };

    const result = await sendOrderConfirmationEmail(mockOrderData);

    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Test order confirmation email sent' : 'Failed to send email',
      details: result
    });

  } catch (error) {
    console.error('Test order email error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send test email', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}