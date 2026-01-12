interface PerfectDayBannerProps {
  isPerfectDay: boolean;
}

export function PerfectDayBanner({ isPerfectDay }: PerfectDayBannerProps) {
  if (!isPerfectDay) return null;

  return (
    <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-4 mb-6 animate-pulse-glow">
      <div className="flex items-center justify-center gap-3">
        <span className="text-2xl">✨</span>
        <div className="text-center">
          <p className="font-bold text-yellow-300">Perfect Day!</p>
          <p className="text-sm text-yellow-200/70">All daily goals completed +25 XP</p>
        </div>
        <span className="text-2xl">✨</span>
      </div>
    </div>
  );
}
