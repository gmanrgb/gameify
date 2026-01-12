import type { Task } from '@questlog/shared';

interface TaskCheckboxProps {
  task: Task;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  color?: string;
}

export function TaskCheckbox({ task, checked, onToggle, color }: TaskCheckboxProps) {
  return (
    <label
      className={`
        flex items-center gap-3 p-3 rounded-lg cursor-pointer
        transition-all duration-200
        ${checked 
          ? 'bg-white/5' 
          : 'bg-bg-tertiary hover:bg-white/5'
        }
      `}
    >
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onToggle(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`
            w-6 h-6 rounded-md border-2 flex items-center justify-center
            transition-all duration-200
            ${checked 
              ? 'border-transparent' 
              : 'border-white/20 hover:border-white/40'
            }
          `}
          style={checked ? { backgroundColor: color || 'var(--color-accent)' } : undefined}
        >
          {checked && (
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
      <span
        className={`
          flex-1 transition-all duration-200
          ${checked 
            ? 'text-text-secondary line-through' 
            : 'text-text-primary'
          }
        `}
      >
        {task.title}
      </span>
      {task.notes && (
        <span className="text-text-secondary text-sm" title={task.notes}>
          📝
        </span>
      )}
    </label>
  );
}
