import { prisma } from './prisma'

// Helper function to create or update user with proper email handling
export async function createOrUpdateUser(data: {
  email: string
  name?: string
  image?: string
}) {
  const emailLower = data.email.toLowerCase()
  
  return prisma.user.upsert({
    where: { email: data.email },
    update: {
      name: data.name,
      image: data.image,
      emailLower,
    },
    create: {
      email: data.email,
      emailLower,
      name: data.name,
      image: data.image,
    },
  })
}

// Helper to find user by email (case insensitive)
export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { emailLower: email.toLowerCase() }
  })
}