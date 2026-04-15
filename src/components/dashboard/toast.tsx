'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

const toastConfig = {
  success: {
    icon: CheckCircle2,
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
    titleColor: 'text-emerald-400',
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-red-500/20',
    border: 'border-red-500/30',
    iconColor: 'text-red-400',
    titleColor: 'text-red-400',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/30',
    iconColor: 'text-blue-400',
    titleColor: 'text-blue-400',
  },
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}) {
  const [isExiting, setIsExiting] = useState(false);
  const config = toastConfig[toast.type];
  const Icon = config.icon;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 4000);

    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`pointer-events-auto flex w-80 items-start gap-3 rounded-xl border ${config.bg} ${config.border} p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 ${
        isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
      }`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.bg}`}
      >
        <Icon className={`h-4 w-4 ${config.iconColor}`} />
      </div>
      <div className="flex-1">
        <p className={`text-sm font-semibold ${config.titleColor}`}>
          {toast.title}
        </p>
        {toast.message && (
          <p className="mt-0.5 text-xs text-slate-400">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => {
          setIsExiting(true);
          setTimeout(() => onDismiss(toast.id), 300);
        }}
        className="shrink-0 rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }: ToastProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// Hook for managing toasts
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...toast, id }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, addToast, dismissToast };
}
