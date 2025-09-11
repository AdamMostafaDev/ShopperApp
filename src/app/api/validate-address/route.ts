import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();
    
    // Simple response - no validation, just accept any address
    return NextResponse.json({
      status: 'VALID',
      original: address || '',
      formatted: address || '',
      parsed: {
        street1: address || '',
        street2: '',
        city: '',
        state: '',
        postalCode: '',
        country: ''
      }
    });

  } catch (error) {
    return NextResponse.json({
      status: 'VALID',
      original: '',
      formatted: '',
      parsed: {
        street1: '',
        street2: '',
        city: '',
        state: '',
        postalCode: '',
        country: ''
      }
    });
  }
}