import type { Badge } from '@questlog/shared';
import { Card, CardBody } from '../ui/Card';

interface BadgeDisplayProps {
  badges: Badge[];
  title?: string;
  showLocked?: boolean;
}

export function BadgeDisplay({ badges, title = 'Recent Badges', showLocked = false }: BadgeDisplayProps) {
  const displayBadges = showLocked 
    ? badges 
    : badges.filter(b => b.unlockedAt);

  if (displayBadges.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-text-secondary mb-3">{title}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {displayBadges.map((badge) => (
          <Card
            key={badge.id}
            className={`
              ${badge.unlockedAt 
                ? 'border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-orange-500/10' 
                : 'opacity-50 grayscale'
              }
            `}
          >
            <CardBody className="text-center py-4">
              <span className="text-3xl block mb-2">{badge.icon}</span>
              <p className="font-semibold text-text-primary text-sm">{badge.title}</p>
              <p className="text-xs text-text-secondary mt-1">{badge.description}</p>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
