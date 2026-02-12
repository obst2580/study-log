import express from 'express';
import cors from 'cors';
import { config } from './config.js';

import { authMiddleware } from './middleware/authMiddleware.js';
import authRouter from './routes/auth.js';
import subjectsRouter from './routes/subjects.js';
import topicsRouter from './routes/topics.js';
import studySessionsRouter from './routes/studySessions.js';
import reviewsRouter from './routes/reviews.js';
import searchRouter from './routes/search.js';
import settingsRouter from './routes/settings.js';
import statsRouter from './routes/stats.js';
import backupRouter from './routes/backup.js';
import examsRouter from './routes/exams.js';
import goalsRouter from './routes/goals.js';
import parentRouter from './routes/parent.js';
import reflectionsRouter from './routes/reflections.js';
import achievementsRouter from './routes/achievements.js';
import analysisRouter from './routes/analysis.js';
import reportsRouter from './routes/reports.js';
import challengesRouter from './routes/challenges.js';
import curriculumRouter from './routes/curriculum.js';
import splendorRouter from './routes/splendor.js';

export function createApp() {
  const app = express();

  app.use(cors({
    origin: config.corsOrigins[0] === '*' ? '*' : config.corsOrigins,
  }));
  app.use(express.json({ limit: '50mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Public routes (no auth required)
  app.use('/api/auth', authRouter);

  // Protected routes (auth required)
  app.use(authMiddleware);
  app.use('/api/subjects', subjectsRouter);
  app.use('/api/topics', topicsRouter);
  app.use('/api/study-sessions', studySessionsRouter);
  app.use('/api/reviews', reviewsRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/stats', statsRouter);
  app.use('/api/backup', backupRouter);
  app.use('/api/exams', examsRouter);
  app.use('/api/goals', goalsRouter);
  app.use('/api/parent', parentRouter);
  app.use('/api/reflections', reflectionsRouter);
  app.use('/api/achievements', achievementsRouter);
  app.use('/api/analysis', analysisRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/challenges', challengesRouter);
  app.use('/api/curriculum', curriculumRouter);
  app.use('/api/splendor', splendorRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
