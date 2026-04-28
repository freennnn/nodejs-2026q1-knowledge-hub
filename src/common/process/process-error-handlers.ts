import { type INestApplication, type LoggerService } from '@nestjs/common';
import { getErrorMessage, getErrorStack } from '@/common/utils/error-details';

export function setupProcessErrorHandlers(app: INestApplication, logger: LoggerService) {
  let isShuttingDown = false;

  const shutdown = async (event: string, error: unknown) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.error(`${event}: ${getErrorMessage(error)}`, getErrorStack(error), 'Process');

    try {
      await app.close();
    } catch (shutdownError) {
      logger.error(
        `Graceful shutdown failed: ${getErrorMessage(shutdownError)}`,
        getErrorStack(shutdownError),
        'Process',
      );
    } finally {
      process.exit(1);
    }
  };

  process.on('uncaughtException', (error) => {
    void shutdown('Uncaught exception', error);
  });

  process.on('unhandledRejection', (reason) => {
    void shutdown('Unhandled rejection', reason);
  });
}
