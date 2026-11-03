import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { testPrismaConnection, disconnectPrisma } from './database/prisma.js';

const app = createApp();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : env.PORT;

async function bootstrap() {
  logger.info(`Starting Decidix Backend service in ${env.NODE_ENV} mode...`);

  // Verify PostgreSQL connectivity via Prisma Client (single connection pool)
  await testPrismaConnection();

  const server = app.listen(PORT, () => {
    logger.info(`Decidix API Server running successfully on port ${PORT}`);
    logger.info(`API Base URL: http://localhost:${PORT}${env.API_PREFIX}`);
    logger.info(`Health check: http://localhost:${PORT}/health`);
    logger.info(`Subsystem health: http://localhost:${PORT}${env.API_PREFIX}/health`);
  });

  // Graceful shutdown handling
  const shutdown = async () => {
    logger.info('Shutting down server gracefully...');
    await disconnectPrisma();
    server.close(() => {
      logger.info('Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  logger.error('Fatal bootstrap error', err);
  process.exit(1);
});

