import { prisma } from './prisma'
import { headers } from 'next/headers'

interface AuditEventData {
  action: string
  userId?: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

export async function logAuthEvent({
  action,
  userId,
  details,
  ipAddress,
  userAgent
}: AuditEventData) {
  try {
    // Get IP and User Agent from headers if not provided
    let ip = ipAddress || 'unknown'
    let ua = userAgent || 'unknown'
    
    // Only try to get headers if we're in a server context
    try {
      const headersList = headers()
      ip = ipAddress || headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown'
      ua = userAgent || headersList.get('user-agent') || 'unknown'
    } catch {
      // Headers not available (likely in Auth.js callback context)
    }

    await prisma.auditLog.create({
      data: {
        action,
        userId,
        details: details ? JSON.stringify(details) : null,
        ipAddress: ip,
        userAgent: ua,
      }
    })
  } catch (error) {
    // Don't throw - audit logging shouldn't break auth flow
    console.error('Failed to log audit event:', error)
  }
}

export async function getAuditLogs(userId?: string, action?: string, limit = 100) {
  return prisma.auditLog.findMany({
    where: {
      ...(userId && { userId }),
      ...(action && { action }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: {
        select: {
          email: true,
          name: true,
        }
      }
    }
  })
}