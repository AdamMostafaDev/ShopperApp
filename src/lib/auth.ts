import { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import { logAuthEvent } from "./audit"
import type { DefaultSession } from "next-auth"
import * as argon2 from "argon2"
import { z } from "zod"

export const authConfig: NextAuthConfig = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log("🔐 Authorize called with:", credentials)
        
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials)

        if (!parsedCredentials.success) {
          console.log("❌ Validation failed:", parsedCredentials.error)
          return null
        }

        const { email, password } = parsedCredentials.data
        console.log("📧 Looking up user:", email.toLowerCase())
        
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() }
        })

        console.log("👤 Found user:", user ? "YES" : "NO")
        if (!user || !user.password) {
          console.log("❌ No user or no password")
          return null
        }

        console.log("🔒 Comparing passwords...")
        try {
          const passwordsMatch = await argon2.verify(user.password, password)
          console.log("🔓 Passwords match:", passwordsMatch)
          
          if (passwordsMatch) {
            console.log("✅ Login successful")
            return {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
            }
          }
        } catch (error) {
          console.log("💥 Password comparison error:", error)
          return null
        }

        console.log("❌ Password mismatch")
        return null
      },
    }),
  ],
  session: {
    strategy: "jwt", // Required for credentials provider
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: "/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
  },
  callbacks: {
    async signIn({ user, account, profile, email }) {
      // Check if user is locked (simplified for now)
      if (user.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { lockedUntil: true, loginAttempts: true }
        })
        
        if (dbUser?.lockedUntil && new Date() < dbUser.lockedUntil) {
          return false
        }
      }

      return true
    },
    
    async jwt({ token, user }) {
      // Add user data to token on signin
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { 
            id: true,
            firstName: true,
            lastName: true,
            role: true, 
            twoFactorEnabled: true,
            emailVerified: true 
          }
        })
        
        token.id = user.id
        token.firstName = dbUser?.firstName
        token.lastName = dbUser?.lastName
        token.role = dbUser?.role || 'USER'
        token.twoFactorEnabled = dbUser?.twoFactorEnabled || false
        token.emailVerified = dbUser?.emailVerified

        // Update last login time
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        })
      }
      
      return token
    },

    async session({ session, token }) {
      // Send properties to the client
      if (token) {
        session.user.id = token.id as string
        session.user.firstName = token.firstName as string
        session.user.lastName = token.lastName as string
        session.user.role = token.role as string
        session.user.twoFactorEnabled = token.twoFactorEnabled as boolean
        session.user.emailVerified = token.emailVerified as Date | null
      }
      
      return session
    },

    async redirect({ url, baseUrl }) {
      // Secure redirect handling
      if (url.startsWith("/")) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
      // Default redirect after successful sign-in
      return `${baseUrl}/orders`
    }
  },
  
  events: {
    async signOut({ session }) {
      // Log sign out event without headers dependency
      console.log('User signed out:', session?.user?.email)
    },
    
    async linkAccount({ user, account }) {
      // Log account linking without headers dependency
      console.log('Account linked:', user.email, account.provider)
    }
  },

  // Security settings
  useSecureCookies: process.env.NODE_ENV === "production",
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" 
        ? `__Secure-next-auth.session-token`
        : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === "production"
      }
    }
  },

  // Enable debug in development
  debug: process.env.NODE_ENV === "development",
}

// For client-side type inference
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      firstName: string
      lastName: string
      role: string
      twoFactorEnabled: boolean
      emailVerified: Date | null
    } & DefaultSession["user"]
  }
}