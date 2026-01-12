interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

const roundedStyles = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

export function Skeleton({
  width = '100%',
  height = '1rem',
  className = '',
  rounded = 'md',
}: SkeletonProps) {
  return (
    <div
      className={`
        animate-pulse bg-white/10
        ${roundedStyles[rounded]}
        ${className}
      `}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-bg-secondary rounded-xl border border-white/5 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton width="2.5rem" height="2.5rem" rounded="full" />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height="1rem" />
          <Skeleton width="40%" height="0.75rem" />
        </div>
      </div>
      <Skeleton height="0.5rem" rounded="full" />
      <div className="space-y-2">
        <Skeleton height="1.5rem" rounded="md" />
        <Skeleton height="1.5rem" rounded="md" />
      </div>
    </div>
  );
}
