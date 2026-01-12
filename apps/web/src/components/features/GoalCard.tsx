import { Card, CardBody } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { TaskCheckbox } from './TaskCheckbox';
import { Button } from '../ui/Button';
import { useStore } from '../../store';
import type { TodayGoalData } from '@questlog/shared';

interface GoalCardProps {
  data: TodayGoalData;
}

export function GoalCard({ data }: GoalCardProps) {
  const { checkIn, undoCheckIn } = useStore();
  const { goal, tasks, periodProgress, checkins } = data;

  const checkedTaskIds = new Set(
    checkins.filter(c => c.taskId).map(c => c.taskId)
  );
  const hasGoalLevelCheckin = checkins.some(c => !c.taskId);

  const handleTaskToggle = async (taskId: string, checked: boolean) => {
    if (checked) {
      await checkIn(goal.id, taskId);
    } else {
      await undoCheckIn(goal.id, taskId);
    }
  };

  const handleGoalCheckin = async () => {
    if (hasGoalLevelCheckin) {
      await undoCheckIn(goal.id);
    } else {
      await checkIn(goal.id);
    }
  };

  const getCadenceLabel = () => {
    switch (goal.cadence) {
      case 'daily':
        return 'today';
      case 'weekly':
        return 'this week';
      case 'monthly':
        return 'this month';
    }
  };

  return (
    <Card accentColor={goal.color} className="mb-4 animate-slide-up">
      <CardBody>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
              style={{ backgroundColor: `${goal.color}20` }}
            >
              🎯
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">{goal.title}</h3>
              <p className="text-sm text-text-secondary">
                {periodProgress.current}/{periodProgress.target} {getCadenceLabel()}
              </p>
            </div>
          </div>
          {goal.currentStreak > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/10 rounded-lg">
              <span className="text-sm">🔥</span>
              <span className="text-sm font-bold text-orange-400">{goal.currentStreak}</span>
            </div>
          )}
        </div>

        {/* Progress */}
        <ProgressBar
          value={periodProgress.current}
          max={periodProgress.target}
          size="sm"
          color={goal.color}
          className="mb-3"
        />

        {/* Tasks or Goal-level checkin */}
        {tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskCheckbox
                key={task.id}
                task={task}
                checked={checkedTaskIds.has(task.id)}
                onToggle={(checked) => handleTaskToggle(task.id, checked)}
                color={goal.color}
              />
            ))}
          </div>
        ) : (
          <Button
            variant={hasGoalLevelCheckin ? 'secondary' : 'primary'}
            size="sm"
            className="w-full"
            onClick={handleGoalCheckin}
          >
            {hasGoalLevelCheckin ? '✓ Completed' : '+ Check In'}
          </Button>
        )}

        {/* Completion badge */}
        {periodProgress.completed && (
          <div className="mt-3 flex items-center justify-center gap-2 py-2 bg-green-500/10 rounded-lg text-green-400">
            <span>✓</span>
            <span className="text-sm font-medium">Period Complete!</span>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
