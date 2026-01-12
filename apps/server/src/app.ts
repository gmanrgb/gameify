import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUI from '@fastify/swagger-ui';
import fastifyMultipart from '@fastify/multipart';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

import { initDatabaseAsync, type DatabaseWrapper } from './db/connection.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerProfileRoutes } from './routes/profile.js';
import { registerGoalRoutes } from './routes/goals.js';
import { registerTaskRoutes } from './routes/tasks.js';
import { registerCheckinRoutes } from './routes/checkins.js';
import { registerReviewRoutes } from './routes/review.js';
import { registerBackupRoutes } from './routes/backup.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function createApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport: process.env.NODE_ENV !== 'production' ? {
        target: 'pino-pretty',
        options: { colorize: true }
      } : undefined,
    },
  });

  // Initialize database
  const db = await initDatabaseAsync();

  // Decorate fastify with db instance
  app.decorate('db', db);

  // Register plugins
  await app.register(cors, {
    origin: process.env.NODE_ENV === 'production' ? false : true,
  });

  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max
    },
  });

  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'QuestLog API',
        description: 'Local-first goal gamification API',
        version: '1.0.0',
      },
      servers: [{ url: '/api' }],
    },
  });

  await app.register(fastifySwaggerUI, {
    routePrefix: '/api/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  // Register API routes
  await app.register(async (apiApp) => {
    registerHealthRoutes(apiApp);
    registerProfileRoutes(apiApp);
    registerGoalRoutes(apiApp);
    registerTaskRoutes(apiApp);
    registerCheckinRoutes(apiApp);
    registerReviewRoutes(apiApp);
    registerBackupRoutes(apiApp);
  }, { prefix: '/api' });

  // Serve static files in production
  const webDistPath = join(__dirname, '../../../web/dist');
  if (process.env.NODE_ENV === 'production' || existsSync(webDistPath)) {
    if (existsSync(webDistPath)) {
      await app.register(fastifyStatic, {
        root: webDistPath,
        prefix: '/',
      });

      // SPA fallback
      app.setNotFoundHandler((request, reply) => {
        if (request.url.startsWith('/api')) {
          return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
        }
        return reply.sendFile('index.html');
      });
    }
  }

  // Global error handler
  app.setErrorHandler((error, request, reply) => {
    app.log.error(error);
    
    if (error.validation) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: error.validation.reduce((acc, v) => {
            acc[v.instancePath || 'body'] = v.message || 'Invalid value';
            return acc;
          }, {} as Record<string, string>),
        },
      });
    }

    return reply.status(error.statusCode || 500).send({
      success: false,
      error: {
        code: error.statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message: error.message || 'Internal server error',
      },
    });
  });

  return app;
}

// Type augmentation for Fastify
declare module 'fastify' {
  interface FastifyInstance {
    db: DatabaseWrapper;
  }
}
