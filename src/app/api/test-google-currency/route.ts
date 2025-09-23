import { NextResponse } from 'next/server';
import { testGoogleCurrencyConversion } from '@/lib/currency';

export async function GET() {
  try {
    console.log('Starting Google currency conversion test...');

    // Run the test function
    await testGoogleCurrencyConversion();

    return NextResponse.json({
      success: true,
      message: 'Test completed. Check server console for results.'
    });
  } catch (error) {
    console.error('Test failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}