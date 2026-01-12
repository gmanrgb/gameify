import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { 
  CreateCheckinSchema, 
  UndoCheckinSchema,
  DateQuerySchema,
  getCurrentTimestamp,
  getPeriodKey,
  type Checkin,
  type GoalWithRecurrence,
  type Task,
  type TodayGoalData
} from '@questlog/shared';
import { sendSuccess, sendError, NotFoundError } from '../utils/errors.js';
import { getProfile, addXp, subtractXp } from '../services/xp.service.js';
import { updateStreakOnCheckin, awardFreezeTokenOnLevelUp } from '../services/streak.service.js';
import { checkAndUnlockBadges, getRecentBadges } from '../services/badge.service.js';
import { checkPerfectDay, handlePerfectDayCheck } from '../services/perfect-day.service.js';

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
  weekly_target: number | null;
  monthly_target: number | null;
  weekdays_mask: number | null;
  due_time_minutes: number | null;
}

interface TaskRow {
  id: string;
  goal_id: string;
  title: string;
  notes: string | null;
  active: number;
  order_index: number;
  created_at: string;
}

interface CheckinRow {
  id: string;
  goal_id: string;
  task_id: string | null;
  date: string;
  xp_earned: number;
  created_at: string;
}

function rowToCheckin(row: CheckinRow): Checkin {
  return {
    id: row.id,
    goalId: row.goal_id,
    taskId: row.task_id,
    date: row.date,
    xpEarned: row.xp_earned,
    createdAt: row.created_at,
  };
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

function rowToGoal(g: GoalRow): GoalWithRecurrence {
  return {
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
    taskCount: 0, // Will be set below
  };
}

export function registerCheckinRoutes(app: FastifyInstance) {
  // GET /api/today
  app.get('/today', async (request, reply) => {
    const query = DateQuerySchema.parse(request.query);
    const date = query.date;

    // Get profile
    const profile = getProfile(app.db);

    // Get all non-archived goals
    const goalsRows = app.db.prepare(`
      SELECT g.*, r.weekly_target, r.monthly_target, r.weekdays_mask, r.due_time_minutes
      FROM goals g
      LEFT JOIN recurrence r ON g.id = r.goal_id
      WHERE g.archived = 0
      ORDER BY g.created_at ASC
    `).all() as GoalRow[];

    const todayGoals: TodayGoalData[] = [];

    for (const goalRow of goalsRows) {
      const goal = rowToGoal(goalRow);

      // Get active tasks for this goal
      const tasksRows = app.db.prepare(`
        SELECT * FROM tasks 
        WHERE goal_id = ? AND active = 1
        ORDER BY order_index ASC
      `).all(goal.id) as TaskRow[];
      
      const tasks = tasksRows.map(rowToTask);
      goal.taskCount = tasks.length;

      // Get checkins for this date
      const checkinsRows = app.db.prepare(`
        SELECT * FROM checkins 
        WHERE goal_id = ? AND date = ?
      `).all(goal.id, date) as CheckinRow[];
      
      const checkins = checkinsRows.map(rowToCheckin);

      // Calculate period progress
      const periodKey = getPeriodKey(goal.cadence, date);
      let periodCheckins: CheckinRow[];
      
      if (goal.cadence === 'daily') {
        periodCheckins = checkinsRows;
      } else if (goal.cadence === 'weekly') {
        // Get checkins for the entire week
        const [year, weekNum] = periodKey.split('-W').map(Number);
        periodCheckins = app.db.prepare(`
          SELECT c.* FROM checkins c
          JOIN goals g ON c.goal_id = g.id
          WHERE c.goal_id = ? 
          AND strftime('%Y', c.date) || '-W' || printf('%02d', 
            CAST((strftime('%j', c.date) - strftime('%w', c.date) + 10) / 7 AS INTEGER)
          ) = ?
        `).all(goal.id, periodKey) as CheckinRow[];
      } else {
        // Monthly - get checkins for the month
        const monthPrefix = periodKey; // YYYY-MM
        periodCheckins = app.db.prepare(`
          SELECT * FROM checkins 
          WHERE goal_id = ? AND date LIKE ?
        `).all(goal.id, `${monthPrefix}%`) as CheckinRow[];
      }

      // Calculate target
      let target = 1;
      if (goal.cadence === 'weekly' && goal.recurrence?.weeklyTarget) {
        target = goal.recurrence.weeklyTarget;
      } else if (goal.cadence === 'monthly' && goal.recurrence?.monthlyTarget) {
        target = goal.recurrence.monthlyTarget;
      } else if (goal.cadence === 'daily' && tasks.length > 0) {
        target = tasks.length;
      }

      const current = periodCheckins.length;
      const completed = current >= target;

      todayGoals.push({
        goal,
        tasks,
        periodProgress: { current, target, completed },
        checkins,
      });
    }

    const isPerfectDay = checkPerfectDay(app.db, date);
    const recentBadges = getRecentBadges(app.db, 24);

    return sendSuccess(reply, {
      date,
      profile,
      goals: todayGoals,
      isPerfectDay,
      recentBadges,
    });
  });

  // POST /api/checkins
  app.post('/checkins', async (request, reply) => {
    const parseResult = CreateCheckinSchema.safeParse(request.body);
    
    if (!parseResult.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid checkin data');
    }

    const { date, goalId, taskId } = parseResult.data;

    // Verify goal exists
    const goal = app.db.prepare(`
      SELECT g.*, r.weekly_target, r.monthly_target, r.weekdays_mask, r.due_time_minutes
      FROM goals g
      LEFT JOIN recurrence r ON g.id = r.goal_id
      WHERE g.id = ?
    `).get(goalId) as GoalRow | undefined;

    if (!goal) {
      throw new NotFoundError('Goal not found');
    }

    // Verify task exists if provided
    if (taskId) {
      const task = app.db.prepare('SELECT id FROM tasks WHERE id = ? AND goal_id = ?').get(taskId, goalId);
      if (!task) {
        throw new NotFoundError('Task not found');
      }
    }

    // Check for existing checkin (idempotency)
    let existingCheckin: CheckinRow | undefined;
    if (taskId) {
      existingCheckin = app.db.prepare(`
        SELECT * FROM checkins 
        WHERE goal_id = ? AND task_id = ? AND date = ?
      `).get(goalId, taskId, date) as CheckinRow | undefined;
    } else {
      existingCheckin = app.db.prepare(`
        SELECT * FROM checkins 
        WHERE goal_id = ? AND task_id IS NULL AND date = ?
      `).get(goalId, date) as CheckinRow | undefined;
    }

    if (existingCheckin) {
      // Return existing checkin
      const profile = getProfile(app.db);
      const isPerfectDay = checkPerfectDay(app.db, date);
      
      return sendSuccess(reply, {
        checkin: rowToCheckin(existingCheckin),
        xpEarned: 0,
        profile,
        badgesUnlocked: [],
        isPerfectDay,
      });
    }

    // Check if this is the first checkin ever
    const checkinCount = (app.db.prepare('SELECT COUNT(*) as count FROM checkins').get() as { count: number }).count;
    const isFirstCheckin = checkinCount === 0;

    // Create checkin
    const id = randomUUID();
    const now = getCurrentTimestamp();
    const xpEarned = goal.xp_per_check;

    const transaction = app.db.transaction(() => {
      // Insert checkin
      app.db.prepare(`
        INSERT INTO checkins (id, goal_id, task_id, date, xp_earned, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, goalId, taskId || null, date, xpEarned, now);

      // Add XP
      const xpResult = addXp(app.db, xpEarned);

      // Award freeze token on level up
      if (xpResult.didLevelUp) {
        awardFreezeTokenOnLevelUp(app.db);
      }

      // Update streak
      const streakResult = updateStreakOnCheckin(app.db, goalId, date);

      // Check and handle perfect day
      const perfectDayResult = handlePerfectDayCheck(app.db, date);
      
      // Add perfect day bonus XP if newly achieved
      let totalXpEarned = xpEarned;
      if (perfectDayResult.bonusAwarded > 0) {
        addXp(app.db, perfectDayResult.bonusAwarded);
        totalXpEarned += perfectDayResult.bonusAwarded;
      }

      // Get updated profile for badge checking
      const profile = getProfile(app.db);

      // Check badges
      const badgesUnlocked = checkAndUnlockBadges(app.db, {
        xpTotal: profile.xpTotal,
        level: profile.level,
        perfectDays: profile.perfectDays,
        newStreak: streakResult.newStreak,
        isFirstCheckin,
      });

      return {
        xpEarned: totalXpEarned,
        profile,
        streakResult,
        perfectDayResult,
        badgesUnlocked,
      };
    });

    const result = transaction();

    const checkin = app.db.prepare('SELECT * FROM checkins WHERE id = ?').get(id) as CheckinRow;

    return sendSuccess(reply, {
      checkin: rowToCheckin(checkin),
      xpEarned: result.xpEarned,
      profile: result.profile,
      streakUpdate: result.streakResult.action !== 'none' ? {
        newStreak: result.streakResult.newStreak,
        isNewBest: result.streakResult.newBestStreak !== undefined && 
                   result.streakResult.newBestStreak === result.streakResult.newStreak,
      } : undefined,
      badgesUnlocked: result.badgesUnlocked,
      isPerfectDay: result.perfectDayResult.isPerfectDay,
      perfectDayBonus: result.perfectDayResult.bonusAwarded > 0 ? result.perfectDayResult.bonusAwarded : undefined,
    }, 201);
  });

  // POST /api/checkins/undo
  app.post('/checkins/undo', async (request, reply) => {
    const parseResult = UndoCheckinSchema.safeParse(request.body);
    
    if (!parseResult.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid undo request');
    }

    const { date, goalId, taskId } = parseResult.data;

    // Find the checkin
    let checkin: CheckinRow | undefined;
    if (taskId) {
      checkin = app.db.prepare(`
        SELECT * FROM checkins 
        WHERE goal_id = ? AND task_id = ? AND date = ?
      `).get(goalId, taskId, date) as CheckinRow | undefined;
    } else {
      checkin = app.db.prepare(`
        SELECT * FROM checkins 
        WHERE goal_id = ? AND task_id IS NULL AND date = ?
      `).get(goalId, date) as CheckinRow | undefined;
    }

    if (!checkin) {
      throw new NotFoundError('Checkin not found');
    }

    const transaction = app.db.transaction(() => {
      // Subtract XP (badges and perfect days are NOT reversed)
      subtractXp(app.db, checkin!.xp_earned);

      // Delete checkin
      app.db.prepare('DELETE FROM checkins WHERE id = ?').run(checkin!.id);
    });

    transaction();

    const profile = getProfile(app.db);
    const isPerfectDay = checkPerfectDay(app.db, date);

    return sendSuccess(reply, { 
      undone: true,
      profile,
      isPerfectDay,
    });
  });
}
