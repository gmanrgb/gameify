import { useEffect } from 'react';
import { useStore } from '../store';
import { ProfileHeader } from '../components/features/ProfileHeader';
import { DateNavigator } from '../components/features/DateNavigator';
import { GoalCard } from '../components/features/GoalCard';
import { PerfectDayBanner } from '../components/features/PerfectDayBanner';
import { BadgeDisplay } from '../components/features/BadgeDisplay';
import { CardSkeleton } from '../components/ui/Skeleton';

export function Today() {
  const { todayData, isLoading, loadToday } = useStore();

  useEffect(() => {
    loadToday();
  }, [loadToday]);

  return (
    <div className="animate-slide-up">
      <ProfileHeader />
      <DateNavigator />

      {isLoading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : todayData ? (
        <>
          <PerfectDayBanner isPerfectDay={todayData.isPerfectDay} />
          
          {todayData.recentBadges.length > 0 && (
            <BadgeDisplay badges={todayData.recentBadges} title="Recently Unlocked" />
          )}

          {todayData.goals.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎯</div>
              <h2 className="text-xl font-bold text-text-primary mb-2">No Goals Yet</h2>
              <p className="text-text-secondary mb-6">
                Create your first goal to start tracking your progress!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {todayData.goals.map((goalData, index) => (
                <div
                  key={goalData.goal.id}
                  style={{ animationDelay: `${index * 50}ms` }}
                  className="animate-slide-up"
                >
                  <GoalCard data={goalData} />
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 text-text-secondary">
          <p>Failed to load data. Please try again.</p>
        </div>
      )}
    </div>
  );
}
