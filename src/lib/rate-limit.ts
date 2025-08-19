import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible'
import { NextRequest } from 'next/server'

// In-memory rate limiter (fallback)
const rateLimiterMemory = new RateLimiterMemory({
  keyGenerator: (req: NextRequest) => {
    return req.headers.get('x-forwarded-for') || 
           req.headers.get('x-real-ip') || 
           'unknown'
  },
  points: 5, // Number of attempts
  duration: 60, // Per 60 seconds
})

// Redis rate limiter (for production with Redis) - disabled for now
let rateLimiterRedis: RateLimiterRedis | null = null

// Temporarily disable Redis to fix immediate issues
// if (process.env.REDIS_URL) {
//   try {
//     rateLimiterRedis = new RateLimiterRedis({
//       storeClient: require('redis').createClient({
//         url: process.env.REDIS_URL,
//       }),
//       keyPrefix: 'auth_limit',
//       points: 5, // Number of attempts
//       duration: 60, // Per 60 seconds
//     })
//   } catch (error) {
//     console.warn('Redis rate limiter failed to initialize, using memory limiter')
//   }
// }

export async function checkRateLimit(req: NextRequest) {
  const rateLimiter = rateLimiterRedis || rateLimiterMemory
  
  try {
    await rateLimiter.consume(req)
    return { success: true }
  } catch (rateLimiterRes) {
    const remainingAttempts = rateLimiterRes?.remainingHits || 0
    const msBeforeNext = rateLimiterRes?.msBeforeNext || 60000
    
    return { 
      success: false, 
      remainingAttempts,
      resetTime: new Date(Date.now() + msBeforeNext)
    }
  }
}

// Rate limiter specifically for auth endpoints
export const authRateLimit = new RateLimiterMemory({
  points: 3, // More restrictive for auth
  duration: 60,
})

// Rate limiter for email sending
export const emailRateLimit = new RateLimiterMemory({
  points: 2, // Only 2 emails per minute
  duration: 60,
})

export async function rateLimitByIP(req: NextRequest, limiter: RateLimiterMemory) {
  const ip = req.headers.get('x-forwarded-for') || 
            req.headers.get('x-real-ip') || 
            'unknown'
  
  try {
    await limiter.consume(ip)
    return { success: true }
  } catch (rateLimiterRes) {
    return { 
      success: false, 
      resetTime: new Date(Date.now() + (rateLimiterRes?.msBeforeNext || 60000))
    }
  }
}