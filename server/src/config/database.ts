import { PrismaClient } from '@prisma/client';

// Global reference to prevent multiple instances in serverless
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// For serverless functions, ensure the DATABASE_URL includes pgbouncer parameter
const databaseUrl = process.env.DATABASE_URL || '';
const enhancedUrl = databaseUrl.includes('pgbouncer=true')
  ? databaseUrl
  : databaseUrl.includes('?')
    ? `${databaseUrl}&pgbouncer=true&connect_timeout=15`
    : `${databaseUrl}?pgbouncer=true&connect_timeout=15`;

const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: enhancedUrl,
    },
  },
});

// In development, store the instance globally to prevent multiple connections
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
