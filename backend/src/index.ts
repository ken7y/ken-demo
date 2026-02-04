import express, { Application } from 'express';
import cors from 'cors';
import { config } from './config';
import { routes } from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { logger } from './lib/logger';

const app: Application = express();
const PORT = config.port;

// Middleware
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api', routes);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    env: config.nodeEnv,
    healthCheck: `http://localhost:${PORT}/api/health`,
  });
});

export { app };
