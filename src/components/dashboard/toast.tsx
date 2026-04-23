'use client';

import { Toaster, toast as hotToast } from 'react-hot-toast';

export interface ToastMessage {
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

function renderMessage(input: Omit<ToastMessage, 'id'>) {
  return (
    <div className="flex flex-col">
      <span className="text-sm font-semibold">{input.title}</span>
      {input.message ? <span className="mt-0.5 text-xs opacity-90">{input.message}</span> : null}
    </div>
  );
}

export function toast(input: Omit<ToastMessage, 'id'>) {
  const message = renderMessage(input);
  if (input.type === 'success') {
    hotToast.success(message);
    return;
  }
  if (input.type === 'error') {
    hotToast.error(message);
    return;
  }
  hotToast(message);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          className: 'rounded-xl border border-white/10 bg-slate-900/95 text-slate-100 shadow-2xl',
          success: {
            iconTheme: {
              primary: '#34d399',
              secondary: '#052e16',
            },
          },
          error: {
            iconTheme: {
              primary: '#f87171',
              secondary: '#450a0a',
            },
          },
        }}
      />
    </>
  );
}
