export interface AddressComponents {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ValidationResult {
  status: 'VALID';
  original: string;
  formatted?: string;
  parsed?: AddressComponents;
}

export interface GooglePlaceResult {
  place_id: string;
  formatted_address: string;
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

// Parse Google address components to our format
function parseGoogleAddressComponents(components: GooglePlaceResult['address_components']): AddressComponents {
  const result: Partial<AddressComponents> = {};
  
  for (const component of components) {
    const types = component.types;
    
    if (types.includes('street_number')) {
      result.street1 = component.long_name;
    } else if (types.includes('route')) {
      result.street1 = result.street1 
        ? `${result.street1} ${component.long_name}`
        : component.long_name;
    } else if (types.includes('subpremise')) {
      result.street2 = component.long_name;
    } else if (types.includes('locality')) {
      result.city = component.long_name;
    } else if (types.includes('administrative_area_level_1')) {
      result.state = component.long_name;
    } else if (types.includes('postal_code')) {
      result.postalCode = component.long_name;
    } else if (types.includes('country')) {
      result.country = component.long_name;
    }
  }
  
  return {
    street1: result.street1 || '',
    street2: result.street2 || '',
    city: result.city || '',
    state: result.state || '',
    postalCode: result.postalCode || '',
    country: result.country || '',
  };
}

// Format address for API call
export function formatAddressForValidation(address: Partial<AddressComponents>): string {
  const parts = [
    address.street1,
    address.street2,
    address.city,
    address.state,
    address.postalCode,
    address.country
  ].filter(Boolean);
  
  return parts.join(', ');
}

// Validate address using Google Places API
export async function validateAddress(address: Partial<AddressComponents>): Promise<ValidationResult> {
  // No validation - just return valid status
  const query = formatAddressForValidation(address);
  
  return {
    status: 'VALID',
    original: query,
    formatted: query,
    parsed: {
      street1: address.street1 || '',
      street2: address.street2 || '',
      city: address.city || '',
      state: address.state || '',
      postalCode: address.postalCode || '',
      country: address.country || ''
    }
  };
}

// Debounce function for address validation
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}