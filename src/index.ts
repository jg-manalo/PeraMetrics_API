import app from './app.js';
import redisClient from './config/redis.js';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    const server = app.listen(PORT, () => {
      console.log(`PeraMetrics API running on port ${PORT}`);
    });

    const shutdown = async (signal: string) => {
      console.log(`${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        console.log('HTTP server closed');

        try {
          if (redisClient.isOpen) {
            await redisClient.quit();
            console.log('Redis connection closed');
          }

          process.exit(0);
        } catch (error) {
          console.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
