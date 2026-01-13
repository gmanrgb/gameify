import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import type { WeeklyReviewResponse } from '@questlog/shared';
import { formatDateString, parseLocalDateString } from '@questlog/shared';

type Tab = 'weekly' | 'monthly';

export function Review() {
  const [activeTab, setActiveTab] = useState<Tab>('weekly');
  const [weeklyData, setWeeklyData] = useState<WeeklyReviewResponse | null>(null);
  const [monthlyData, setMonthlyData] = useState<WeeklyReviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    return formatDateString(monday);
  });
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    if (activeTab === 'weekly') {
      loadWeeklyData();
    } else {
      loadMonthlyData();
    }
  }, [activeTab, weekStart, currentMonth]);

  const loadWeeklyData = async () => {
    setIsLoading(true);
    try {
      const data = await api.getWeeklyReview(weekStart);
      setWeeklyData(data);
    } catch (error) {
      console.error('Failed to load weekly review:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMonthlyData = async () => {
    setIsLoading(true);
    try {
      const data = await api.getMonthlyReview(currentMonth);
      setMonthlyData(data);
    } catch (error) {
      console.error('Failed to load monthly review:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const goToPreviousWeek = () => {
    const date = parseLocalDateString(weekStart);
    date.setDate(date.getDate() - 7);
    setWeekStart(formatDateString(date));
  };

  const goToNextWeek = () => {
    const date = parseLocalDateString(weekStart);
    date.setDate(date.getDate() + 7);
    setWeekStart(formatDateString(date));
  };

  const goToPreviousMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    if (month === 1) {
      setCurrentMonth(`${year - 1}-12`);
    } else {
      setCurrentMonth(`${year}-${String(month - 1).padStart(2, '0')}`);
    }
  };

  const goToNextMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    if (month === 12) {
      setCurrentMonth(`${year + 1}-01`);
    } else {
      setCurrentMonth(`${year}-${String(month + 1).padStart(2, '0')}`);
    }
  };

  const formatWeekDisplay = () => {
    if (!weeklyData) return '';
    const start = parseLocalDateString(weeklyData.startDate);
    const end = parseLocalDateString(weeklyData.endDate);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const formatMonthDisplay = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getMaxXp = (days: { xpEarned: number }[]) => {
    const max = Math.max(...days.map(d => d.xpEarned));
    return max > 0 ? max : 1;
  };

  return (
    <div className="animate-slide-up">
      <h1 className="text-2xl font-bold font-display gradient-text mb-6">Review</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('weekly')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'weekly'
            ? 'bg-white/10 text-text-primary'
            : 'text-text-secondary hover:text-text-primary'
            }`}
        >
          Weekly
        </button>
        <button
          onClick={() => setActiveTab('monthly')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'monthly'
            ? 'bg-white/10 text-text-primary'
            : 'text-text-secondary hover:text-text-primary'
            }`}
        >
          Monthly
        </button>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between bg-bg-secondary rounded-xl border border-white/5 p-3 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={activeTab === 'weekly' ? goToPreviousWeek : goToPreviousMonth}
        >
          ← Prev
        </Button>
        <span className="font-semibold text-text-primary">
          {activeTab === 'weekly' ? formatWeekDisplay() : formatMonthDisplay()}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={activeTab === 'weekly' ? goToNextWeek : goToNextMonth}
        >
          Next →
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton height="8rem" rounded="lg" />
          <Skeleton height="12rem" rounded="lg" />
        </div>
      ) : activeTab === 'weekly' && weeklyData ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardBody className="text-center">
                <p className="text-3xl font-bold gradient-text">{weeklyData.totals.xp}</p>
                <p className="text-sm text-text-secondary">XP Earned</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center">
                <p className="text-3xl font-bold text-green-400">{weeklyData.totals.checkins}</p>
                <p className="text-sm text-text-secondary">Check-ins</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center">
                <p className="text-3xl font-bold text-yellow-400">{weeklyData.totals.perfectDays}</p>
                <p className="text-sm text-text-secondary">Perfect Days</p>
              </CardBody>
            </Card>
          </div>

          {/* XP Chart */}
          <Card className="mb-6">
            <CardHeader>
              <h3 className="font-semibold text-text-primary">Daily XP</h3>
            </CardHeader>
            <CardBody>
              <div className="flex items-end justify-between gap-2 h-32">
                {weeklyData.days.map((day) => {
                  const height = (day.xpEarned / getMaxXp(weeklyData.days)) * 100;
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-t transition-all ${day.isPerfectDay
                          ? 'bg-gradient-to-t from-yellow-500 to-orange-500'
                          : 'bg-gradient-to-t from-primary to-secondary'
                          }`}
                        style={{ height: `${Math.max(height, 4)}%` }}
                        title={`${day.xpEarned} XP`}
                      />
                      <span className="text-xs text-text-secondary">
                        {parseLocalDateString(day.date).toLocaleDateString('en-US', { weekday: 'short' })[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          {/* Streak Highlights */}
          {weeklyData.streakHighlights.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-text-primary">🔥 Streak Highlights</h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-2">
                  {weeklyData.streakHighlights.map((highlight) => (
                    <div
                      key={highlight.goalId}
                      className="flex items-center justify-between p-2 bg-bg-tertiary rounded-lg"
                    >
                      <span className="text-text-primary">{highlight.goalTitle}</span>
                      <span className="font-bold text-orange-400">
                        {highlight.currentStreak} days
                      </span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </>
      ) : activeTab === 'monthly' && monthlyData ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardBody className="text-center">
                <p className="text-3xl font-bold gradient-text">{monthlyData.totals.xp}</p>
                <p className="text-sm text-text-secondary">XP Earned</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center">
                <p className="text-3xl font-bold text-green-400">{monthlyData.totals.checkins}</p>
                <p className="text-sm text-text-secondary">Check-ins</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center">
                <p className="text-3xl font-bold text-yellow-400">{monthlyData.totals.perfectDays}</p>
                <p className="text-sm text-text-secondary">Perfect Days</p>
              </CardBody>
            </Card>
          </div>

          {/* Calendar Grid */}
          <Card className="mb-6">
            <CardHeader>
              <h3 className="font-semibold text-text-primary">Activity Calendar</h3>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-7 gap-1">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                  <div key={i} className="text-center text-xs text-text-secondary py-1">
                    {day}
                  </div>
                ))}
                {monthlyData.days.map((day) => {
                  const date = parseLocalDateString(day.date);
                  const dayOfWeek = date.getDay();
                  const dayNum = date.getDate();
                  // Add empty cells for first week offset
                  const offset = dayNum === 1 ? (dayOfWeek === 0 ? 6 : dayOfWeek - 1) : 0;

                  return (
                    <>
                      {dayNum === 1 && Array.from({ length: offset }).map((_, i) => (
                        <div key={`empty-${i}`} />
                      ))}
                      <div
                        key={day.date}
                        className={`
                          aspect-square rounded flex items-center justify-center text-xs
                          ${day.isPerfectDay
                            ? 'bg-yellow-500/30 text-yellow-300'
                            : day.checkinsCount > 0
                              ? 'bg-primary/30 text-primary'
                              : 'bg-white/5 text-text-secondary'
                          }
                        `}
                        title={`${day.date}: ${day.xpEarned} XP, ${day.checkinsCount} check-ins`}
                      >
                        {dayNum}
                      </div>
                    </>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          {/* Streak Highlights */}
          {monthlyData.streakHighlights.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-text-primary">🔥 Current Streaks</h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-2">
                  {monthlyData.streakHighlights.map((highlight) => (
                    <div
                      key={highlight.goalId}
                      className="flex items-center justify-between p-2 bg-bg-tertiary rounded-lg"
                    >
                      <span className="text-text-primary">{highlight.goalTitle}</span>
                      <span className="font-bold text-orange-400">
                        {highlight.currentStreak} days
                      </span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}
