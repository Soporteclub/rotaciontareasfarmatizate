import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Validate DATABASE_URL at startup
const dbUrl = process.env.DATABASE_URL
if (dbUrl && dbUrl.startsWith('file:')) {
  throw new Error(
    `DATABASE_URL is set to a SQLite path ("${dbUrl}"), but the schema uses PostgreSQL. ` +
    `Please update your .env file with a valid PostgreSQL connection string.`
  )
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
