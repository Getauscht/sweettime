import { PrismaClient } from '@prisma/client'
import { validateEnv } from './env'

// Validate environment early to fail fast or warn in non-production
try {
    validateEnv()
} catch (e) {
    // Re-throw after logging so that startup fails in production
    console.error('Environment validation failed:', e)
    throw e
}

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
