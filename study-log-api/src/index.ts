import { config } from './config.js';
import { initDatabase, closeDatabase, getDbPath } from './database/index.js';
import { createApp } from './app.js';
import { startReviewScheduler } from './services/reviewScheduler.js';

console.log('StudyLog API starting...');
console.log(`Database path: ${getDbPath()}`);
console.log(`Port: ${config.port}`);

// Initialize database
initDatabase();
console.log('Database initialized');

// Create Express app
const app = createApp();

// Start review scheduler
startReviewScheduler();

// Start server
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
  console.log('  ... and more');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => {
    closeDatabase();
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\nShutting down...');
  server.close(() => {
    closeDatabase();
    console.log('Server closed');
    process.exit(0);
  });
});
