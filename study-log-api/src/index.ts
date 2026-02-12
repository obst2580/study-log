import { config } from './config.js';
import { initDatabase, closePool } from './database/index.js';
import { createApp } from './app.js';
import { startReviewScheduler } from './services/reviewScheduler.js';
import { initializeAllTemplates } from './services/curriculumService.js';

async function main() {
  console.log('StudyLog API starting...');
  console.log(`Port: ${config.port}`);

  await initDatabase();
  console.log('Database initialized');

  const app = createApp();

  startReviewScheduler();

  // 전체 학년 커리큘럼 템플릿 일괄 생성 (비동기, 서버 시작 블로킹 없음)
  initializeAllTemplates()
    .then(() => console.log('[Curriculum] Initialization dispatched for all grades'))
    .catch((err) => console.error('[Curriculum] Initialization error:', err));

  const server = app.listen(config.port, () => {
    console.log(`StudyLog API running on http://localhost:${config.port}`);
    console.log('Available endpoints:');
    console.log('  GET  /api/health');
    console.log('  GET  /api/subjects');
    console.log('  POST /api/subjects');
    console.log('  GET  /api/topics');
    console.log('  POST /api/topics');
    console.log('  GET  /api/reviews/upcoming');
    console.log('  GET  /api/reviews/due-today');
    console.log('  GET  /api/search?q=xxx');
    console.log('  GET  /api/stats');
    console.log('  GET  /api/backup/export');
    console.log('  GET  /api/exams');
    console.log('  ... and more');
  });

  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    server.close(() => {
      closePool()
        .then(() => {
          console.log('Server closed');
          process.exit(0);
        })
        .catch((err) => {
          console.error('Error closing pool:', err);
          process.exit(1);
        });
    });
  });

  process.on('SIGTERM', () => {
    console.log('\nShutting down...');
    server.close(() => {
      closePool()
        .then(() => {
          console.log('Server closed');
          process.exit(0);
        })
        .catch((err) => {
          console.error('Error closing pool:', err);
          process.exit(1);
        });
    });
  });
}

main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
