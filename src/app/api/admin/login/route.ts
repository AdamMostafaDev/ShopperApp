import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Find admin by username or email
    const admin = await prisma.admin.findFirst({
      where: {
        OR: [
          { username: username },
          { email: username }
        ]
      }
    });

    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if admin account is active
    if (!admin.isActive) {
      return NextResponse.json(
        { success: false, error: 'Account is disabled' },
        { status: 401 }
      );
    }

    // Check if admin is locked
    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      return NextResponse.json(
        { success: false, error: 'Account is temporarily locked' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      // Increment login attempts
      await prisma.admin.update({
        where: { id: admin.id },
        data: {
          loginAttempts: admin.loginAttempts + 1,
          // Lock account if too many attempts (5 attempts = 30 min lock)
          lockedUntil: admin.loginAttempts >= 4 ? new Date(Date.now() + 30 * 60 * 1000) : null
        }
      });

      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Reset login attempts on successful login
    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: request.ip || request.headers.get('x-forwarded-for') || 'unknown'
      }
    });

    // Create admin session
    const sessionToken = jwt.sign(
      { adminId: admin.id, email: admin.email, role: admin.role },
      process.env.NEXTAUTH_SECRET || 'admin-secret',
      { expiresIn: '8h' }
    );

    await prisma.adminSession.create({
      data: {
        adminId: admin.id,
        sessionToken,
        ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 hours
      }
    });

    // Log admin login
    await prisma.adminAuditLog.create({
      data: {
        adminId: admin.id,
        action: 'ADMIN_LOGIN',
        details: {
          method: 'username_password',
          success: true
        },
        ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    });

    // Set session cookie
    const response = NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        username: admin.username,
        role: admin.role,
        mustChangePassword: admin.mustChangePassword
      }
    });

    response.cookies.set('admin-session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 // 8 hours
    });

    return response;

  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}