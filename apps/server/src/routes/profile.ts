import { FastifyInstance } from 'fastify';
import { UpdateProfileSchema } from '@questlog/shared';
import { getProfile, updateProfileSettings } from '../services/xp.service.js';
import { sendSuccess, sendError } from '../utils/errors.js';

export function registerProfileRoutes(app: FastifyInstance) {
  // GET /api/profile
  app.get('/profile', async (request, reply) => {
    const profile = getProfile(app.db);
    return sendSuccess(reply, profile);
  });

  // PATCH /api/profile
  app.patch('/profile', async (request, reply) => {
    const parseResult = UpdateProfileSchema.safeParse(request.body);
    
    if (!parseResult.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid profile data', 
        parseResult.error.flatten().fieldErrors as Record<string, string>
      );
    }

    const profile = updateProfileSettings(app.db, parseResult.data);
    return sendSuccess(reply, profile);
  });
}
