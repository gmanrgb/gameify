import { useEffect, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  type: ToastType;
  message: string;
  onClose: () => void;
  duration?: number;
}

const typeStyles: Record<ToastType, string> = {
  success: 'bg-green-500/20 border-green-500/30 text-green-300',
  error: 'bg-red-500/20 border-red-500/30 text-red-300',
  info: 'bg-blue-500/20 border-blue-500/30 text-blue-300',
};

const icons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
};

export function Toast({ type, message, onClose, duration = 3000 }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, duration - 300);

    const closeTimer = setTimeout(() => {
      onClose();
    }, duration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(closeTimer);
    };
  }, [duration, onClose]);

  return (
    <div
      className={`
        fixed bottom-20 left-1/2 -translate-x-1/2 z-50
        px-4 py-3 rounded-lg border backdrop-blur-sm
        flex items-center gap-3 shadow-lg
        ${typeStyles[type]}
        ${isExiting ? 'animate-slide-down opacity-0' : 'animate-slide-up'}
      `}
      role="alert"
    >
      <span className="text-lg">{icons[type]}</span>
      <span className="font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
