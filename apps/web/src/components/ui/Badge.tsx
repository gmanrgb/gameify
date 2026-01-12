interface BadgeProps {
  icon?: string;
  text: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
}

const variantStyles = {
  default: 'bg-white/10 text-text-primary',
  success: 'bg-green-500/20 text-green-300',
  warning: 'bg-yellow-500/20 text-yellow-300',
  danger: 'bg-red-500/20 text-red-300',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
};

export function Badge({ icon, text, variant = 'default', size = 'md' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        ${variantStyles[variant]}
        ${sizeStyles[size]}
      `}
    >
      {icon && <span>{icon}</span>}
      {text}
    </span>
  );
}
