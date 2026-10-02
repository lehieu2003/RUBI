'use client';

import { Toaster, toast as hotToast } from 'react-hot-toast';

export interface ToastMessage {
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

function renderMessage(input: Omit<ToastMessage, 'id'>) {
  return (
    <div className="flex flex-col text-left">
      <span className="text-xs font-bold text-on-surface">{input.title}</span>
      {input.message ? <span className="mt-0.5 text-[11px] text-on-surface-variant">{input.message}</span> : null}
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
  if (input.type === 'warning') {
    hotToast(message, { icon: '⚠️' });
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
          className: '!rounded !border !border-outline-variant !bg-card !text-on-surface !shadow-lg !py-2.5 !px-3.5',
          success: {
            iconTheme: {
              primary: '#1b6d24',
              secondary: '#a0f399',
            },
          },
          error: {
            iconTheme: {
              primary: '#ba1a1a',
              secondary: '#ffdad6',
            },
          },
        }}
      />
    </>
  );
}
