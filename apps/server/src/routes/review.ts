import { FastifyInstance } from 'fastify';
import { 
  WeeklyReviewQuerySchema, 
  MonthlyReviewQuerySchema,
  getWeekDates,
  getMonthDates,
  formatDateString
} from '@questlog/shared';
import { sendSuccess, sendError } from '../utils/errors.js';
import { getPerfectDaysInRange } from '../services/perfect-day.service.js';

interface CheckinAggRow {
  date: string;
  xp_total: number;
  checkin_count: number;
}

interface StreakHighlightRow {
  id: string;
  title: string;
  current_streak: number;
}

export function registerReviewRoutes(app: FastifyInstance) {
  // GET /api/review/weekly
  app.get('/review/weekly', async (request, reply) => {
    const parseResult = WeeklyReviewQuerySchema.safeParse(request.query);
    
    if (!parseResult.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid query parameters');
    }

    const { start } = parseResult.data;
    const dates = getWeekDates(start);
    const endDate = dates[dates.length - 1];

    // Get aggregated checkin data
    const checkinData = app.db.prepare(`
      SELECT date, SUM(xp_earned) as xp_total, COUNT(*) as checkin_count
      FROM checkins
      WHERE date >= ? AND date <= ?
      GROUP BY date
    `).all(start, endDate) as CheckinAggRow[];

    const checkinMap = new Map(checkinData.map(d => [d.date, d]));

    // Get perfect days in range
    const perfectDays = new Set(getPerfectDaysInRange(app.db, start, endDate));

    // Build daily data
    const days = dates.map(date => ({
      date,
      xpEarned: checkinMap.get(date)?.xp_total || 0,
      checkinsCount: checkinMap.get(date)?.checkin_count || 0,
      isPerfectDay: perfectDays.has(date),
    }));

    // Calculate totals
    const totals = {
      xp: days.reduce((sum, d) => sum + d.xpEarned, 0),
      checkins: days.reduce((sum, d) => sum + d.checkinsCount, 0),
      perfectDays: days.filter(d => d.isPerfectDay).length,
    };

    // Get streak highlights (top 5 goals by current streak)
    const streakHighlights = app.db.prepare(`
      SELECT id, title, current_streak
      FROM goals
      WHERE archived = 0 AND current_streak > 0
      ORDER BY current_streak DESC
      LIMIT 5
    `).all() as StreakHighlightRow[];

    return sendSuccess(reply, {
      startDate: start,
      endDate,
      days,
      totals,
      streakHighlights: streakHighlights.map(s => ({
        goalId: s.id,
        goalTitle: s.title,
        currentStreak: s.current_streak,
      })),
    });
  });

  // GET /api/review/monthly
  app.get('/review/monthly', async (request, reply) => {
    const parseResult = MonthlyReviewQuerySchema.safeParse(request.query);
    
    if (!parseResult.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid query parameters');
    }

    const { month } = parseResult.data;
    const dates = getMonthDates(month);
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];

    // Get aggregated checkin data
    const checkinData = app.db.prepare(`
      SELECT date, SUM(xp_earned) as xp_total, COUNT(*) as checkin_count
      FROM checkins
      WHERE date >= ? AND date <= ?
      GROUP BY date
    `).all(startDate, endDate) as CheckinAggRow[];

    const checkinMap = new Map(checkinData.map(d => [d.date, d]));

    // Get perfect days in range
    const perfectDays = new Set(getPerfectDaysInRange(app.db, startDate, endDate));

    // Build daily data
    const days = dates.map(date => ({
      date,
      xpEarned: checkinMap.get(date)?.xp_total || 0,
      checkinsCount: checkinMap.get(date)?.checkin_count || 0,
      isPerfectDay: perfectDays.has(date),
    }));

    // Calculate totals
    const totals = {
      xp: days.reduce((sum, d) => sum + d.xpEarned, 0),
      checkins: days.reduce((sum, d) => sum + d.checkinsCount, 0),
      perfectDays: days.filter(d => d.isPerfectDay).length,
    };

    // Get streak highlights
    const streakHighlights = app.db.prepare(`
      SELECT id, title, current_streak
      FROM goals
      WHERE archived = 0 AND current_streak > 0
      ORDER BY current_streak DESC
      LIMIT 5
    `).all() as StreakHighlightRow[];

    return sendSuccess(reply, {
      month,
      days,
      totals,
      streakHighlights: streakHighlights.map(s => ({
        goalId: s.id,
        goalTitle: s.title,
        currentStreak: s.current_streak,
      })),
    });
  });
}
