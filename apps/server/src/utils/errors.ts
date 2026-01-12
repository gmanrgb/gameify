import { FastifyReply } from 'fastify';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL_ERROR',
    message: string,
    public details?: Record<string, string>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, string>) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
  }
}

export function sendSuccess<T>(reply: FastifyReply, data: T, statusCode: number = 200) {
  return reply.status(statusCode).send({ success: true, data });
}

export function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: AppError['code'],
  message: string,
  details?: Record<string, string>
) {
  return reply.status(statusCode).send({
    success: false,
    error: { code, message, details },
  });
}
