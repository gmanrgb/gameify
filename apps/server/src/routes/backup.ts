import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { 
  getCurrentTimestamp,
  calculateLevel
} from '@questlog/shared';
import { sendSuccess, sendError } from '../utils/errors.js';
import { getProfile } from '../services/xp.service.js';
import { getAllBadges } from '../services/badge.service.js';

// Backup validation schema
const BackupSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  data: z.object({
    profile: z.object({
      xpTotal: z.number(),
      level: z.number(),
      perfectDays: z.number(),
      theme: z.string(),
      accent: z.string(),
    }),
    goals: z.array(z.object({
      id: z.string(),
      title: z.string(),
      cadence: z.string(),
      color: z.string(),
      xpPerCheck: z.number(),
      archived: z.boolean(),
      currentStreak: z.number(),
      bestStreak: z.number(),
      lastPeriodKey: z.string().nullable(),
      freezeTokens: z.number(),
      createdAt: z.string(),
    })),
    recurrence: z.array(z.object({
      goalId: z.string(),
      weeklyTarget: z.number().nullable(),
      monthlyTarget: z.number().nullable(),
      weekdaysMask: z.number().nullable(),
      dueTimeMinutes: z.number().nullable(),
    })),
    tasks: z.array(z.object({
      id: z.string(),
      goalId: z.string(),
      title: z.string(),
      notes: z.string().nullable(),
      active: z.boolean(),
      orderIndex: z.number(),
      createdAt: z.string(),
    })),
    checkins: z.array(z.object({
      id: z.string(),
      goalId: z.string(),
      taskId: z.string().nullable(),
      date: z.string(),
      xpEarned: z.number(),
      createdAt: z.string(),
    })),
    badges: z.array(z.object({
      id: z.string(),
      key: z.string(),
      title: z.string(),
      description: z.string(),
      icon: z.string(),
      unlockedAt: z.string().nullable(),
    })),
    perfectDaysLog: z.array(z.string()),
  }),
});

export function registerBackupRoutes(app: FastifyInstance) {
  // GET /api/backup/export
  app.get('/backup/export', async (request, reply) => {
    const profile = getProfile(app.db);

    // Get all goals
    const goals = app.db.prepare('SELECT * FROM goals').all() as {
      id: string; title: string; cadence: string; color: string;
      xp_per_check: number; archived: number; current_streak: number;
      best_streak: number; last_period_key: string | null;
      freeze_tokens: number; created_at: string;
    }[];

    // Get all recurrence
    const recurrence = app.db.prepare('SELECT * FROM recurrence').all() as {
      goal_id: string; weekly_target: number | null; monthly_target: number | null;
      weekdays_mask: number | null; due_time_minutes: number | null;
    }[];

    // Get all tasks
    const tasks = app.db.prepare('SELECT * FROM tasks').all() as {
      id: string; goal_id: string; title: string; notes: string | null;
      active: number; order_index: number; created_at: string;
    }[];

    // Get all checkins
    const checkins = app.db.prepare('SELECT * FROM checkins').all() as {
      id: string; goal_id: string; task_id: string | null;
      date: string; xp_earned: number; created_at: string;
    }[];

    // Get all badges
    const badges = getAllBadges(app.db);

    // Get perfect days log
    const perfectDaysLog = app.db.prepare('SELECT date FROM perfect_days_log ORDER BY date').all() as { date: string }[];

    const backup = {
      version: 1,
      exportedAt: getCurrentTimestamp(),
      data: {
        profile,
        goals: goals.map(g => ({
          id: g.id,
          title: g.title,
          cadence: g.cadence,
          color: g.color,
          xpPerCheck: g.xp_per_check,
          archived: g.archived === 1,
          currentStreak: g.current_streak,
          bestStreak: g.best_streak,
          lastPeriodKey: g.last_period_key,
          freezeTokens: g.freeze_tokens,
          createdAt: g.created_at,
        })),
        recurrence: recurrence.map(r => ({
          goalId: r.goal_id,
          weeklyTarget: r.weekly_target,
          monthlyTarget: r.monthly_target,
          weekdaysMask: r.weekdays_mask,
          dueTimeMinutes: r.due_time_minutes,
        })),
        tasks: tasks.map(t => ({
          id: t.id,
          goalId: t.goal_id,
          title: t.title,
          notes: t.notes,
          active: t.active === 1,
          orderIndex: t.order_index,
          createdAt: t.created_at,
        })),
        checkins: checkins.map(c => ({
          id: c.id,
          goalId: c.goal_id,
          taskId: c.task_id,
          date: c.date,
          xpEarned: c.xp_earned,
          createdAt: c.created_at,
        })),
        badges,
        perfectDaysLog: perfectDaysLog.map(p => p.date),
      },
    };

    return reply
      .header('Content-Type', 'application/json')
      .header('Content-Disposition', `attachment; filename="questlog-backup-${new Date().toISOString().split('T')[0]}.json"`)
      .send(backup);
  });

  // POST /api/backup/import
  app.post('/backup/import', async (request, reply) => {
    try {
      // Handle multipart
      const data = await request.file();
      if (!data) {
        return sendError(reply, 400, 'VALIDATION_ERROR', 'No file uploaded');
      }

      const buffer = await data.toBuffer();
      const jsonString = buffer.toString('utf-8');
      const json = JSON.parse(jsonString);

      // Validate backup structure
      const parseResult = BackupSchema.safeParse(json);
      if (!parseResult.success) {
        return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid backup file format', {
          details: parseResult.error.message,
        });
      }

      const backup = parseResult.data;

      const transaction = app.db.transaction(() => {
        // Clear all existing data
        app.db.prepare('DELETE FROM perfect_days_log').run();
        app.db.prepare('DELETE FROM checkins').run();
        app.db.prepare('DELETE FROM tasks').run();
        app.db.prepare('DELETE FROM recurrence').run();
        app.db.prepare('DELETE FROM goals').run();

        // Reset profile
        const recalculatedLevel = calculateLevel(backup.data.profile.xpTotal);
        app.db.prepare(`
          UPDATE profile SET 
            xp_total = ?, level = ?, perfect_days = ?, theme = ?, accent = ?
          WHERE id = 1
        `).run(
          backup.data.profile.xpTotal,
          recalculatedLevel,
          backup.data.profile.perfectDays,
          backup.data.profile.theme,
          backup.data.profile.accent
        );

        // Reset badges
        app.db.prepare('UPDATE badges SET unlocked_at = NULL').run();
        for (const badge of backup.data.badges) {
          if (badge.unlockedAt) {
            app.db.prepare('UPDATE badges SET unlocked_at = ? WHERE key = ?')
              .run(badge.unlockedAt, badge.key);
          }
        }

        // Import goals
        for (const goal of backup.data.goals) {
          app.db.prepare(`
            INSERT INTO goals (id, title, cadence, color, xp_per_check, archived, 
                              current_streak, best_streak, last_period_key, freeze_tokens, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            goal.id, goal.title, goal.cadence, goal.color, goal.xpPerCheck,
            goal.archived ? 1 : 0, goal.currentStreak, goal.bestStreak,
            goal.lastPeriodKey, goal.freezeTokens, goal.createdAt
          );
        }

        // Import recurrence
        for (const rec of backup.data.recurrence) {
          app.db.prepare(`
            INSERT INTO recurrence (goal_id, weekly_target, monthly_target, weekdays_mask, due_time_minutes)
            VALUES (?, ?, ?, ?, ?)
          `).run(
            rec.goalId, rec.weeklyTarget, rec.monthlyTarget, rec.weekdaysMask, rec.dueTimeMinutes
          );
        }

        // Import tasks
        for (const task of backup.data.tasks) {
          app.db.prepare(`
            INSERT INTO tasks (id, goal_id, title, notes, active, order_index, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(
            task.id, task.goalId, task.title, task.notes, task.active ? 1 : 0,
            task.orderIndex, task.createdAt
          );
        }

        // Import checkins
        for (const checkin of backup.data.checkins) {
          app.db.prepare(`
            INSERT INTO checkins (id, goal_id, task_id, date, xp_earned, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(
            checkin.id, checkin.goalId, checkin.taskId, checkin.date,
            checkin.xpEarned, checkin.createdAt
          );
        }

        // Import perfect days log
        for (const date of backup.data.perfectDaysLog) {
          app.db.prepare(`
            INSERT INTO perfect_days_log (date, achieved_at)
            VALUES (?, ?)
          `).run(date, getCurrentTimestamp());
        }
      });

      transaction();

      const profile = getProfile(app.db);
      return sendSuccess(reply, { 
        imported: true, 
        profile,
        counts: {
          goals: backup.data.goals.length,
          tasks: backup.data.tasks.length,
          checkins: backup.data.checkins.length,
        }
      });
    } catch (error) {
      console.error('Import error:', error);
      return sendError(reply, 500, 'INTERNAL_ERROR', 'Failed to import backup');
    }
  });

  // POST /api/backup/reset
  app.post('/backup/reset', async (request, reply) => {
    const transaction = app.db.transaction(() => {
      // Clear all data
      app.db.prepare('DELETE FROM perfect_days_log').run();
      app.db.prepare('DELETE FROM checkins').run();
      app.db.prepare('DELETE FROM tasks').run();
      app.db.prepare('DELETE FROM recurrence').run();
      app.db.prepare('DELETE FROM goals').run();

      // Reset profile
      app.db.prepare(`
        UPDATE profile SET 
          xp_total = 0, level = 1, perfect_days = 0, theme = 'aurora', accent = '#7C3AED'
        WHERE id = 1
      `).run();

      // Reset badges
      app.db.prepare('UPDATE badges SET unlocked_at = NULL').run();
    });

    transaction();

    return sendSuccess(reply, { reset: true });
  });
}
