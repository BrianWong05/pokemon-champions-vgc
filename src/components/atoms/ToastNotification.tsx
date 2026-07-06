import React from 'react';

interface ToastNotificationProps {
  message: string | null;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ message }) => {
  if (!message) return null;
  return (
    <div className="fixed bottom-5 right-5 z-50 bg-card text-ink-1 text-xs px-4 py-3 rounded-xl shadow-[var(--shadow-pop)] border border-line animate-toast-slide-in flex items-center gap-2 whitespace-pre-line">
      <div className="w-2 h-2 rounded-full bg-safe animate-ping shrink-0" />
      <span>{message}</span>
    </div>
  );
};

export default ToastNotification;
