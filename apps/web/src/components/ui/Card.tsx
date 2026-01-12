import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  accentColor?: string;
  onClick?: () => void;
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '', accentColor, onClick }: CardProps) {
  return (
    <div
      className={`
        relative bg-bg-secondary rounded-xl border border-white/5
        overflow-hidden
        ${onClick ? 'cursor-pointer hover:border-white/10 transition-colors' : ''}
        ${className}
      `}
      style={accentColor ? { borderLeftColor: accentColor, borderLeftWidth: '3px' } : undefined}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`px-4 py-3 border-b border-white/5 ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = '' }: CardBodyProps) {
  return (
    <div className={`px-4 py-3 ${className}`}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`px-4 py-3 border-t border-white/5 bg-white/[0.02] ${className}`}>
      {children}
    </div>
  );
}
