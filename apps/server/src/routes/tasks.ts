import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { 
  CreateTaskSchema, 
  UpdateTaskSchema, 
  ReorderTasksSchema,
  getCurrentTimestamp,
  type Task
} from '@questlog/shared';
import { sendSuccess, sendError, NotFoundError } from '../utils/errors.js';

interface TaskRow {
  id: string;
  goal_id: string;
  title: string;
  notes: string | null;
  active: number;
  order_index: number;
  created_at: string;
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    goalId: row.goal_id,
    title: row.title,
    notes: row.notes,
    active: row.active === 1,
    orderIndex: row.order_index,
    createdAt: row.created_at,
  };
}

export function registerTaskRoutes(app: FastifyInstance) {
  // GET /api/goals/:goalId/tasks
  app.get('/goals/:goalId/tasks', async (request, reply) => {
    const { goalId } = request.params as { goalId: string };
    
    const goal = app.db.prepare('SELECT id FROM goals WHERE id = ?').get(goalId);
    if (!goal) {
      throw new NotFoundError('Goal not found');
    }

    const tasks = app.db.prepare(`
      SELECT * FROM tasks 
      WHERE goal_id = ? AND active = 1
      ORDER BY order_index ASC
    `).all(goalId) as TaskRow[];

    return sendSuccess(reply, { tasks: tasks.map(rowToTask) });
  });

  // POST /api/goals/:goalId/tasks
  app.post('/goals/:goalId/tasks', async (request, reply) => {
    const { goalId } = request.params as { goalId: string };
    const parseResult = CreateTaskSchema.safeParse(request.body);
    
    if (!parseResult.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid task data');
    }

    const goal = app.db.prepare('SELECT id FROM goals WHERE id = ?').get(goalId);
    if (!goal) {
      throw new NotFoundError('Goal not found');
    }

    const data = parseResult.data;
    const id = randomUUID();
    const now = getCurrentTimestamp();

    // Get next order index
    const maxOrder = app.db.prepare(`
      SELECT COALESCE(MAX(order_index), -1) + 1 as next_order 
      FROM tasks WHERE goal_id = ? AND active = 1
    `).get(goalId) as { next_order: number };

    app.db.prepare(`
      INSERT INTO tasks (id, goal_id, title, notes, order_index, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, goalId, data.title, data.notes || null, maxOrder.next_order, now);

    const task = app.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow;
    return sendSuccess(reply, { task: rowToTask(task) }, 201);
  });

  // PATCH /api/tasks/:taskId
  app.patch('/tasks/:taskId', async (request, reply) => {
    const { taskId } = request.params as { taskId: string };
    const parseResult = UpdateTaskSchema.safeParse(request.body);
    
    if (!parseResult.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid task data');
    }

    const existing = app.db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    if (!existing) {
      throw new NotFoundError('Task not found');
    }

    const data = parseResult.data;
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      values.push(data.title);
    }
    if (data.notes !== undefined) {
      updates.push('notes = ?');
      values.push(data.notes);
    }
    if (data.active !== undefined) {
      updates.push('active = ?');
      values.push(data.active ? 1 : 0);
    }

    if (updates.length > 0) {
      values.push(taskId);
      app.db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    const task = app.db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as TaskRow;
    return sendSuccess(reply, { task: rowToTask(task) });
  });

  // POST /api/goals/:goalId/tasks/reorder
  app.post('/goals/:goalId/tasks/reorder', async (request, reply) => {
    const { goalId } = request.params as { goalId: string };
    const parseResult = ReorderTasksSchema.safeParse(request.body);
    
    if (!parseResult.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid reorder data');
    }

    const goal = app.db.prepare('SELECT id FROM goals WHERE id = ?').get(goalId);
    if (!goal) {
      throw new NotFoundError('Goal not found');
    }

    const { taskIds } = parseResult.data;

    const transaction = app.db.transaction(() => {
      taskIds.forEach((taskId, index) => {
        app.db.prepare('UPDATE tasks SET order_index = ? WHERE id = ? AND goal_id = ?')
          .run(index, taskId, goalId);
      });
    });

    transaction();

    const tasks = app.db.prepare(`
      SELECT * FROM tasks 
      WHERE goal_id = ? AND active = 1
      ORDER BY order_index ASC
    `).all(goalId) as TaskRow[];

    return sendSuccess(reply, { tasks: tasks.map(rowToTask) });
  });

  // DELETE /api/tasks/:taskId (soft delete)
  app.delete('/tasks/:taskId', async (request, reply) => {
    const { taskId } = request.params as { taskId: string };
    
    const existing = app.db.prepare('SELECT id FROM tasks WHERE id = ?').get(taskId);
    if (!existing) {
      throw new NotFoundError('Task not found');
    }

    app.db.prepare('UPDATE tasks SET active = 0 WHERE id = ?').run(taskId);
    return sendSuccess(reply, { deleted: true });
  });
}
