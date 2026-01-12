-- QuestLog Database Schema v1.0

-- Schema versioning
CREATE TABLE schema_version (
  version INTEGER NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO schema_version (version) VALUES (1);

-- Goals table
CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK(length(title) <= 100),
  cadence TEXT NOT NULL CHECK(cadence IN ('daily', 'weekly', 'monthly')),
  color TEXT NOT NULL CHECK(color GLOB '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]'),
  xp_per_check INTEGER NOT NULL DEFAULT 10 CHECK(xp_per_check > 0 AND xp_per_check <= 100),
  archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN (0, 1)),
  created_at TEXT NOT NULL,
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  last_period_key TEXT,
  freeze_tokens INTEGER NOT NULL DEFAULT 0 CHECK(freeze_tokens >= 0)
);

CREATE INDEX idx_goals_archived ON goals(archived);

-- Recurrence settings for goals
CREATE TABLE recurrence (
  goal_id TEXT PRIMARY KEY REFERENCES goals(id) ON DELETE CASCADE,
  weekly_target INTEGER CHECK(weekly_target IS NULL OR (weekly_target >= 1 AND weekly_target <= 7)),
  monthly_target INTEGER CHECK(monthly_target IS NULL OR (monthly_target >= 1 AND monthly_target <= 31)),
  weekdays_mask INTEGER CHECK(weekdays_mask IS NULL OR (weekdays_mask >= 0 AND weekdays_mask <= 127)),
  due_time_minutes INTEGER CHECK(due_time_minutes IS NULL OR (due_time_minutes >= 0 AND due_time_minutes < 1440))
);

-- Tasks table
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK(length(title) <= 200),
  notes TEXT CHECK(notes IS NULL OR length(notes) <= 1000),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_tasks_goal_order ON tasks(goal_id, order_index);

-- Checkins table
CREATE TABLE checkins (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  date TEXT NOT NULL CHECK(date GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
  xp_earned INTEGER NOT NULL CHECK(xp_earned >= 0),
  created_at TEXT NOT NULL
);

-- Unique constraint for task-level checkins
CREATE UNIQUE INDEX idx_checkins_task_date 
  ON checkins(goal_id, task_id, date) 
  WHERE task_id IS NOT NULL;

-- Unique constraint for goal-level checkins (no tasks)
CREATE UNIQUE INDEX idx_checkins_goal_date 
  ON checkins(goal_id, date) 
  WHERE task_id IS NULL;

CREATE INDEX idx_checkins_date ON checkins(date);
CREATE INDEX idx_checkins_goal_date_lookup ON checkins(goal_id, date);

-- Profile table (single row)
CREATE TABLE profile (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  xp_total INTEGER NOT NULL DEFAULT 0 CHECK(xp_total >= 0),
  level INTEGER NOT NULL DEFAULT 1 CHECK(level >= 1),
  perfect_days INTEGER NOT NULL DEFAULT 0 CHECK(perfect_days >= 0),
  theme TEXT NOT NULL DEFAULT 'aurora' CHECK(theme IN ('aurora', 'sunset', 'ocean', 'midnight')),
  accent TEXT NOT NULL DEFAULT '#7C3AED'
);

-- Ensure single profile row exists
INSERT INTO profile (id) VALUES (1);

-- Badges table
CREATE TABLE badges (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏆',
  unlocked_at TEXT
);

-- Seed badge definitions
INSERT INTO badges (id, key, title, description, icon) VALUES
  ('b1', 'streak_7', 'Week Warrior', 'Reach a 7-day streak', '🔥'),
  ('b2', 'streak_30', 'Monthly Master', 'Reach a 30-day streak', '⚡'),
  ('b3', 'streak_100', 'Century Club', 'Reach a 100-day streak', '💎'),
  ('b4', 'xp_1000', 'XP Collector', 'Earn 1,000 XP', '⭐'),
  ('b5', 'xp_10000', 'XP Hoarder', 'Earn 10,000 XP', '🌟'),
  ('b6', 'perfect_day_10', 'Perfect Ten', 'Achieve 10 perfect days', '✨'),
  ('b7', 'perfect_day_50', 'Consistency King', 'Achieve 50 perfect days', '👑'),
  ('b8', 'level_10', 'Double Digits', 'Reach level 10', '🎯'),
  ('b9', 'goals_5', 'Goal Getter', 'Create 5 goals', '📋'),
  ('b10', 'first_checkin', 'First Step', 'Complete your first check-in', '🚀');

-- Perfect days log
CREATE TABLE perfect_days_log (
  date TEXT PRIMARY KEY CHECK(date GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
  achieved_at TEXT NOT NULL
);
