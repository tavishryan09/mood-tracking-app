import { PrismaClient } from '@prisma/client';

// Global reference to prevent multiple instances in serverless
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// In development, store the instance globally to prevent multiple connections
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
