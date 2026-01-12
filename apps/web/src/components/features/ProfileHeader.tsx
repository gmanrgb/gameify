import { ProgressBar } from '../ui/ProgressBar';
import { useStore } from '../../store';
import { getLevelProgress } from '@questlog/shared';

export function ProfileHeader() {
  const { profile, todayData } = useStore();

  if (!profile) return null;

  const progress = getLevelProgress(profile.xpTotal);
  const topStreak = todayData?.goals.reduce((max, g) => 
    Math.max(max, g.goal.currentStreak), 0
  ) || 0;

  return (
    <div className="bg-bg-secondary rounded-xl border border-white/5 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl shadow-lg shadow-primary/20">
            🎮
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold font-display gradient-text">
                Level {profile.level}
              </span>
            </div>
            <p className="text-sm text-text-secondary">
              {progress.current} / {progress.required} XP
            </p>
          </div>
        </div>
        {topStreak > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <span className="text-lg">🔥</span>
            <span className="font-bold text-orange-400">{topStreak}</span>
          </div>
        )}
      </div>
      <ProgressBar value={progress.current} max={progress.required} size="md" />
    </div>
  );
}
