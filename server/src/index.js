import { createApp } from './app.js';
import { env } from './config/env.js';
import { initFirestore } from './config/db.js';

const startServer = async () => {
  try {
    initFirestore();
    const app = createApp();

    const server = app.listen(env.PORT, () => {
      console.log(`CareCircle Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
      console.log(`Health endpoint: http://localhost:${env.PORT}/api/health`);
    });

    const shutdown = () => {
      console.log('Shutting down server gracefully...');
      server.close(() => {
        console.log('Server terminated.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    console.error('Fatal startup error:', err);
    process.exit(1);
  }
};

startServer();
