import path from 'path';
import os from 'os';

export const config = {
  port: parseInt(process.env.STUDYLOG_PORT || '3100', 10),
  dbPath: process.env.STUDYLOG_DB_PATH || path.join(os.homedir(), '.studylog', 'studylog.db'),
  corsOrigins: process.env.STUDYLOG_CORS_ORIGINS?.split(',') || ['*'],
  nodeEnv: process.env.NODE_ENV || 'development',
};
