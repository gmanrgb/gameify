import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { 
  CreateGoalSchema, 
  UpdateGoalSchema, 
  GoalsQuerySchema,
  getCurrentTimestamp,
  type GoalWithRecurrence
} from '@questlog/shared';
import { sendSuccess, sendError, NotFoundError } from '../utils/errors.js';
import { checkAndUnlockBadges } from '../services/badge.service.js';
import { useFreeze, checkFreezeEligibility } from '../services/streak.service.js';
import { UseFreezeSchema } from '@questlog/shared';

interface GoalRow {
  id: string;
  title: string;
  cadence: string;
  color: string;
  xp_per_check: number;
  archived: number;
  current_streak: number;
  best_streak: number;
  last_period_key: string | null;
  freeze_tokens: number;
  created_at: string;
}

interface RecurrenceRow {
  goal_id: string;
  weekly_target: number | null;
  monthly_target: number | null;
  weekdays_mask: number | null;
  due_time_minutes: number | null;
}

export function registerGoalRoutes(app: FastifyInstance) {
  // GET /api/goals
  app.get('/goals', async (request, reply) => {
    const query = GoalsQuerySchema.parse(request.query);
    
    const goals = app.db.prepare(`
      SELECT g.*, 
             r.weekly_target, r.monthly_target, r.weekdays_mask, r.due_time_minutes,
             (SELECT COUNT(*) FROM tasks t WHERE t.goal_id = g.id AND t.active = 1) as task_count
      FROM goals g
      LEFT JOIN recurrence r ON g.id = r.goal_id
      WHERE g.archived = ?
      ORDER BY g.created_at DESC
    `).all(query.archived ? 1 : 0) as (GoalRow & Partial<RecurrenceRow> & { task_count: number })[];

    const formattedGoals: GoalWithRecurrence[] = goals.map(g => ({
      id: g.id,
      title: g.title,
      cadence: g.cadence as GoalWithRecurrence['cadence'],
      color: g.color,
      xpPerCheck: g.xp_per_check,
      archived: g.archived === 1,
      currentStreak: g.current_streak,
      bestStreak: g.best_streak,
      lastPeriodKey: g.last_period_key,
      freezeTokens: g.freeze_tokens,
      createdAt: g.created_at,
      recurrence: g.weekly_target || g.monthly_target || g.weekdays_mask || g.due_time_minutes
        ? {
            weeklyTarget: g.weekly_target,
            monthlyTarget: g.monthly_target,
            weekdaysMask: g.weekdays_mask,
            dueTimeMinutes: g.due_time_minutes,
          }
        : null,
      taskCount: g.task_count,
    }));

    return sendSuccess(reply, { goals: formattedGoals });
  });

  // POST /api/goals
  app.post('/goals', async (request, reply) => {
    const parseResult = CreateGoalSchema.safeParse(request.body);
    
    if (!parseResult.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid goal data');
    }

    const data = parseResult.data;
    const id = randomUUID();
    const now = getCurrentTimestamp();

    // Validate recurrence requirements
    if (data.cadence === 'weekly' && !data.recurrence?.weeklyTarget) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Weekly goals require weeklyTarget');
    }
    if (data.cadence === 'monthly' && !data.recurrence?.monthlyTarget) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Monthly goals require monthlyTarget');
    }

    const transaction = app.db.transaction(() => {
      // Insert goal
      app.db.prepare(`
        INSERT INTO goals (id, title, cadence, color, xp_per_check, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, data.title, data.cadence, data.color, data.xpPerCheck || 10, now);

      // Insert recurrence if provided
      if (data.recurrence) {
        app.db.prepare(`
          INSERT INTO recurrence (goal_id, weekly_target, monthly_target, weekdays_mask, due_time_minutes)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          id,
          data.recurrence.weeklyTarget || null,
          data.recurrence.monthlyTarget || null,
          data.recurrence.weekdaysMask || null,
          data.recurrence.dueTimeMinutes || null
        );
      }

      // Check for goals_5 badge
      const goalCount = (app.db.prepare('SELECT COUNT(*) as count FROM goals WHERE archived = 0').get() as { count: number }).count;
      const badges = checkAndUnlockBadges(app.db, { goalCount });

      return { id, badges };
    });

    const result = transaction();

    // Fetch created goal
    const goal = app.db.prepare(`
      SELECT g.*, r.weekly_target, r.monthly_target, r.weekdays_mask, r.due_time_minutes
      FROM goals g
      LEFT JOIN recurrence r ON g.id = r.goal_id
      WHERE g.id = ?
    `).get(result.id) as GoalRow & Partial<RecurrenceRow>;

    const formattedGoal: GoalWithRecurrence = {
      id: goal.id,
      title: goal.title,
      cadence: goal.cadence as GoalWithRecurrence['cadence'],
      color: goal.color,
      xpPerCheck: goal.xp_per_check,
      archived: goal.archived === 1,
      currentStreak: goal.current_streak,
      bestStreak: goal.best_streak,
      lastPeriodKey: goal.last_period_key,
      freezeTokens: goal.freeze_tokens,
      createdAt: goal.created_at,
      recurrence: goal.weekly_target || goal.monthly_target || goal.weekdays_mask || goal.due_time_minutes
        ? {
            weeklyTarget: goal.weekly_target,
            monthlyTarget: goal.monthly_target,
            weekdaysMask: goal.weekdays_mask,
            dueTimeMinutes: goal.due_time_minutes,
          }
        : null,
      taskCount: 0,
    };

    return sendSuccess(reply, { goal: formattedGoal, badgesUnlocked: result.badges }, 201);
  });

  // PATCH /api/goals/:id
  app.patch('/goals/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parseResult = UpdateGoalSchema.safeParse(request.body);
    
    if (!parseResult.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid goal data');
    }

    const existing = app.db.prepare('SELECT id FROM goals WHERE id = ?').get(id);
    if (!existing) {
      throw new NotFoundError('Goal not found');
    }

    const data = parseResult.data;
    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      values.push(data.title);
    }
    if (data.color !== undefined) {
      updates.push('color = ?');
      values.push(data.color);
    }
    if (data.xpPerCheck !== undefined) {
      updates.push('xp_per_check = ?');
      values.push(data.xpPerCheck);
    }

    if (updates.length > 0) {
      values.push(id);
      app.db.prepare(`UPDATE goals SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    // Update recurrence if provided
    if (data.recurrence !== undefined) {
      const existingRecurrence = app.db.prepare('SELECT goal_id FROM recurrence WHERE goal_id = ?').get(id);
      
      if (existingRecurrence) {
        app.db.prepare(`
          UPDATE recurrence 
          SET weekly_target = ?, monthly_target = ?, weekdays_mask = ?, due_time_minutes = ?
          WHERE goal_id = ?
        `).run(
          data.recurrence?.weeklyTarget || null,
          data.recurrence?.monthlyTarget || null,
          data.recurrence?.weekdaysMask || null,
          data.recurrence?.dueTimeMinutes || null,
          id
        );
      } else if (data.recurrence) {
        app.db.prepare(`
          INSERT INTO recurrence (goal_id, weekly_target, monthly_target, weekdays_mask, due_time_minutes)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          id,
          data.recurrence.weeklyTarget || null,
          data.recurrence.monthlyTarget || null,
          data.recurrence.weekdaysMask || null,
          data.recurrence.dueTimeMinutes || null
        );
      }
    }

    // Return updated goal
    const goal = app.db.prepare(`
      SELECT g.*, r.weekly_target, r.monthly_target, r.weekdays_mask, r.due_time_minutes,
             (SELECT COUNT(*) FROM tasks t WHERE t.goal_id = g.id AND t.active = 1) as task_count
      FROM goals g
      LEFT JOIN recurrence r ON g.id = r.goal_id
      WHERE g.id = ?
    `).get(id) as GoalRow & Partial<RecurrenceRow> & { task_count: number };

    const formattedGoal: GoalWithRecurrence = {
      id: goal.id,
      title: goal.title,
      cadence: goal.cadence as GoalWithRecurrence['cadence'],
      color: goal.color,
      xpPerCheck: goal.xp_per_check,
      archived: goal.archived === 1,
      currentStreak: goal.current_streak,
      bestStreak: goal.best_streak,
      lastPeriodKey: goal.last_period_key,
      freezeTokens: goal.freeze_tokens,
      createdAt: goal.created_at,
      recurrence: goal.weekly_target || goal.monthly_target || goal.weekdays_mask || goal.due_time_minutes
        ? {
            weeklyTarget: goal.weekly_target,
            monthlyTarget: goal.monthly_target,
            weekdaysMask: goal.weekdays_mask,
            dueTimeMinutes: goal.due_time_minutes,
          }
        : null,
      taskCount: goal.task_count,
    };

    return sendSuccess(reply, { goal: formattedGoal });
  });

  // POST /api/goals/:id/archive
  app.post('/goals/:id/archive', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const existing = app.db.prepare('SELECT id FROM goals WHERE id = ?').get(id);
    if (!existing) {
      throw new NotFoundError('Goal not found');
    }

    app.db.prepare('UPDATE goals SET archived = 1 WHERE id = ?').run(id);
    return sendSuccess(reply, { archived: true });
  });

  // POST /api/goals/:id/unarchive
  app.post('/goals/:id/unarchive', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const existing = app.db.prepare('SELECT id FROM goals WHERE id = ?').get(id);
    if (!existing) {
      throw new NotFoundError('Goal not found');
    }

    app.db.prepare('UPDATE goals SET archived = 0 WHERE id = ?').run(id);
    return sendSuccess(reply, { archived: false });
  });

  // POST /api/goals/:id/use-freeze
  app.post('/goals/:id/use-freeze', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parseResult = UseFreezeSchema.safeParse(request.body);
    
    if (!parseResult.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid request');
    }

    const existing = app.db.prepare('SELECT id FROM goals WHERE id = ?').get(id);
    if (!existing) {
      throw new NotFoundError('Goal not found');
    }

    const result = useFreeze(app.db, id, parseResult.data.date);
    return sendSuccess(reply, result);
  });
}
