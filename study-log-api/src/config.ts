import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.STUDYLOG_PORT || '3100', 10),
  corsOrigins: process.env.STUDYLOG_CORS_ORIGINS?.split(',') || ['*'],
  nodeEnv: process.env.NODE_ENV || 'development',
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'studylog',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'changeme',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  },
};
