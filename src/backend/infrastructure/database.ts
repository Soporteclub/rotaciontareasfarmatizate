import { PrismaClient } from '@prisma/client'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Validate DATABASE_URL — reject SQLite URLs (schema uses PostgreSQL)
let dbUrl = process.env.DATABASE_URL

// If DATABASE_URL is missing or points to SQLite, try loading from .env file
if (!dbUrl || dbUrl.startsWith('file:')) {
  try {
    const envPath = resolve(process.cwd(), '.env')
    if (existsSync(envPath)) {
      const envContent = readFileSync(envPath, 'utf-8')
      const match = envContent.match(/^DATABASE_URL\s*=\s*(.+)$/m)
      if (match && match[1]) {
        const envUrl = match[1].trim().replace(/^["']|["']$/g, '')
        if (envUrl.startsWith('postgresql://') || envUrl.startsWith('postgres://')) {
          // Override the system env var with the correct URL from .env
          process.env.DATABASE_URL = envUrl
          dbUrl = envUrl
        }
      }
    }
  } catch {
    // Ignore file read errors
  }
}

if (!dbUrl || dbUrl.startsWith('file:')) {
  throw new Error(
    `DATABASE_URL is set to "${dbUrl || '(empty)'}", but the schema requires PostgreSQL.\n` +
    `Please update your .env file with a valid PostgreSQL connection string like:\n` +
    `DATABASE_URL=postgresql://user:password@host/database?sslmode=require`
  )
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
