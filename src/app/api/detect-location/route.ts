import { NextRequest, NextResponse } from 'next/server';

interface LocationData {
  country: string;
  countryCode: string;
  region?: string;
  city?: string;
  timezone?: string;
  isBangladesh: boolean;
  detectionMethod: string;
  confidence: number;
}

// Free IP geolocation service
async function getLocationFromIP(ip: string): Promise<LocationData | null> {
  try {
    // Using ipapi.co (free tier: 1000 requests/day)
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.reason || 'IP geolocation failed');
    }

    return {
      country: data.country_name || 'Unknown',
      countryCode: data.country_code || '',
      region: data.region,
      city: data.city,
      timezone: data.timezone,
      isBangladesh: data.country_code === 'BD',
      detectionMethod: 'IP Geolocation',
      confidence: data.country_code === 'BD' ? 0.95 : 0.85
    };
  } catch (error) {
    console.error('IP geolocation error:', error);
    return null;
  }
}

// Detect from browser headers and other indicators
function detectFromHeaders(request: NextRequest): LocationData | null {
  const acceptLanguage = request.headers.get('accept-language') || '';
  const userAgent = request.headers.get('user-agent') || '';
  
  // Check for Bengali language preference
  const hasBengaliLanguage = acceptLanguage.toLowerCase().includes('bn') || 
                            acceptLanguage.toLowerCase().includes('bengali');
  
  // Check timezone from headers (if available)
  const timezone = request.headers.get('x-timezone') || '';
  const isDhakaTimezone = timezone === 'Asia/Dhaka' || timezone === 'Asia/Dacca';
  
  if (hasBengaliLanguage || isDhakaTimezone) {
    return {
      country: 'Bangladesh',
      countryCode: 'BD',
      timezone: 'Asia/Dhaka',
      isBangladesh: true,
      detectionMethod: hasBengaliLanguage ? 'Language Headers' : 'Timezone Headers',
      confidence: hasBengaliLanguage ? 0.8 : 0.7
    };
  }
  
  return null;
}

// Get client IP address
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  // Fallback to a default IP for development
  return request.ip || '103.4.145.245'; // Sample Bangladesh IP for testing
}

export async function GET(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    console.log(`Detecting location for IP: ${clientIP}`);
    
    // Try header-based detection first (fastest)
    const headerDetection = detectFromHeaders(request);
    if (headerDetection?.isBangladesh) {
      return NextResponse.json({
        success: true,
        location: headerDetection,
        ip: clientIP
      });
    }
    
    // Try IP-based geolocation
    const ipLocation = await getLocationFromIP(clientIP);
    if (ipLocation) {
      return NextResponse.json({
        success: true,
        location: ipLocation,
        ip: clientIP
      });
    }
    
    // Fallback response
    return NextResponse.json({
      success: true,
      location: {
        country: 'Unknown',
        countryCode: '',
        isBangladesh: false,
        detectionMethod: 'Fallback',
        confidence: 0.1
      },
      ip: clientIP
    });
    
  } catch (error) {
    console.error('Location detection error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to detect location',
        location: {
          country: 'Unknown',
          countryCode: '',
          isBangladesh: false,
          detectionMethod: 'Error',
          confidence: 0
        }
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { timezone, language, userPreference } = body;
    
    let detectionResults: LocationData[] = [];
    
    // IP-based detection
    const clientIP = getClientIP(request);
    const ipLocation = await getLocationFromIP(clientIP);
    if (ipLocation) {
      detectionResults.push(ipLocation);
    }
    
    // Client-side data analysis
    if (timezone === 'Asia/Dhaka' || timezone === 'Asia/Dacca') {
      detectionResults.push({
        country: 'Bangladesh',
        countryCode: 'BD',
        timezone,
        isBangladesh: true,
        detectionMethod: 'Client Timezone',
        confidence: 0.8
      });
    }
    
    if (language && (language.startsWith('bn') || language.includes('bengali'))) {
      detectionResults.push({
        country: 'Bangladesh',
        countryCode: 'BD',
        isBangladesh: true,
        detectionMethod: 'Client Language',
        confidence: 0.75
      });
    }
    
    // User preference overrides everything
    if (userPreference) {
      detectionResults.unshift({
        country: userPreference.country,
        countryCode: userPreference.countryCode,
        isBangladesh: userPreference.countryCode === 'BD',
        detectionMethod: 'User Preference',
        confidence: 1.0
      });
    }
    
    // Return the highest confidence result
    const bestResult = detectionResults.reduce((best, current) => 
      current.confidence > best.confidence ? current : best,
      detectionResults[0] || {
        country: 'Unknown',
        countryCode: '',
        isBangladesh: false,
        detectionMethod: 'No Detection',
        confidence: 0
      }
    );
    
    return NextResponse.json({
      success: true,
      location: bestResult,
      allDetections: detectionResults,
      ip: clientIP
    });
    
  } catch (error) {
    console.error('Location detection error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process location data' },
      { status: 500 }
    );
  }
}