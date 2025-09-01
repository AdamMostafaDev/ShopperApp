'use client';

import { useState, useEffect } from 'react';

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

interface LocationDetectionResult {
  location: LocationData | null;
  loading: boolean;
  error: string | null;
}

export function useLocationDetection(): LocationDetectionResult {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const detectLocation = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get client-side information
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const language = navigator.language;
      
      // Combine server-side and client-side detection
      const response = await fetch('/api/detect-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timezone,
          language
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setLocation(data.location);
        
        // Store in localStorage for future visits
        localStorage.setItem('userLocation', JSON.stringify(data.location));
      } else {
        throw new Error(data.error || 'Failed to detect location');
      }
    } catch (err) {
      console.error('Location detection failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      // Try to load from localStorage as fallback
      const cached = localStorage.getItem('userLocation');
      if (cached) {
        try {
          setLocation(JSON.parse(cached));
        } catch {
          // Invalid cached data, ignore
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check localStorage first
    const cached = localStorage.getItem('userLocation');
    if (cached) {
      try {
        const cachedLocation = JSON.parse(cached);
        setLocation(cachedLocation);
        setLoading(false);
        return;
      } catch {
        // Invalid cached data, continue with detection
      }
    }

    // Perform location detection
    detectLocation();
  }, []);

  return {
    location,
    loading,
    error
  };
}

// Utility function for location checking
export function isBangladeshUser(location: LocationData | null): boolean {
  return location?.isBangladesh === true;
}