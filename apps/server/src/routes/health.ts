import { FastifyInstance } from 'fastify';
import { sendSuccess } from '../utils/errors.js';

export function registerHealthRoutes(app: FastifyInstance) {
  app.get('/health', async (request, reply) => {
    // Verify database connection
    try {
      app.db.prepare('SELECT 1').get();
      return sendSuccess(reply, {
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return reply.status(503).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Database connection failed',
        },
      });
    }
  });
}
