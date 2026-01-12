import { useStore } from '../../store';
import { formatDateString } from '@questlog/shared';
import { Button } from '../ui/Button';

export function DateNavigator() {
  const { selectedDate, setSelectedDate } = useStore();

  const today = formatDateString(new Date());
  const isToday = selectedDate === today;

  const goToPrevious = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(formatDateString(date));
  };

  const goToNext = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    setSelectedDate(formatDateString(date));
  };

  const goToToday = () => {
    setSelectedDate(today);
  };

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <div className="flex items-center justify-between bg-bg-secondary rounded-xl border border-white/5 p-3 mb-6">
      <Button variant="ghost" size="sm" onClick={goToPrevious}>
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </Button>
      
      <div className="flex items-center gap-3">
        <span className="text-xl">📅</span>
        <div className="text-center">
          <p className="font-semibold text-text-primary">{formatDisplayDate(selectedDate)}</p>
          {isToday && (
            <p className="text-xs text-accent font-medium">Today</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!isToday && (
          <Button variant="secondary" size="sm" onClick={goToToday}>
            Today
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={goToNext}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
