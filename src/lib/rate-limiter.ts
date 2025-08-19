// Simple in-memory rate limiter for search requests
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 60 * 60 * 1000) { // 10 requests per hour
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  canMakeRequest(identifier: string = 'global'): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    // Remove requests outside the time window
    const validRequests = requests.filter(timestamp => now - timestamp < this.windowMs);
    
    // Update the stored requests
    this.requests.set(identifier, validRequests);
    
    // Check if we can make another request
    return validRequests.length < this.maxRequests;
  }

  recordRequest(identifier: string = 'global'): void {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    requests.push(now);
    this.requests.set(identifier, requests);
  }

  getTimeUntilNextRequest(identifier: string = 'global'): number {
    const requests = this.requests.get(identifier) || [];
    if (requests.length < this.maxRequests) return 0;
    
    const oldestRequest = Math.min(...requests);
    const timeUntilExpiry = this.windowMs - (Date.now() - oldestRequest);
    return Math.max(0, timeUntilExpiry);
  }
}

// Create a global instance
export const searchRateLimiter = new RateLimiter(15, 60 * 60 * 1000); // 15 searches per hour
