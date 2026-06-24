import { createServer } from 'http';
import { createApp } from './app';
import { initSocketServer } from './sockets';
import { env } from './config/env';
import { prisma } from './config/prisma';

const app = createApp();
const httpServer = createServer(app);

initSocketServer(httpServer);

httpServer.listen(env.port, () => {
  console.log(`🚀 ConnectHub API listening on http://localhost:${env.port}`);
  console.log(`   Environment: ${env.nodeEnv}`);
});

async function shutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  httpServer.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  // Force exit if graceful shutdown hangs.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
