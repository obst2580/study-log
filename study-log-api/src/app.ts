import express from 'express';
import cors from 'cors';
import { config } from './config.js';

import subjectsRouter from './routes/subjects.js';
import topicsRouter from './routes/topics.js';
import studySessionsRouter from './routes/studySessions.js';
import reviewsRouter from './routes/reviews.js';
import searchRouter from './routes/search.js';
import settingsRouter from './routes/settings.js';
import statsRouter from './routes/stats.js';
import backupRouter from './routes/backup.js';

export function createApp() {
  const app = express();

  // Middleware
  app.use(cors({
    origin: config.corsOrigins[0] === '*' ? '*' : config.corsOrigins,
  }));
  app.use(express.json({ limit: '50mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Routes
  app.use('/api/subjects', subjectsRouter);
  app.use('/api/topics', topicsRouter);
  app.use('/api/study-sessions', studySessionsRouter);
  app.use('/api/reviews', reviewsRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/stats', statsRouter);
  app.use('/api/backup', backupRouter);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
