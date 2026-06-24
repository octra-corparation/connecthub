import { PrismaClient } from '@prisma/client';
import { env } from './env';

// Prevent multiple PrismaClient instances during dev hot-reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isProd ? ['error', 'warn'] : ['error', 'warn'],
  });

if (!env.isProd) globalForPrisma.prisma = prisma;
