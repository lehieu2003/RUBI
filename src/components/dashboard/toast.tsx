'use client';

import { Toaster, toast as hotToast } from 'react-hot-toast';

export interface ToastMessage {
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

function renderMessage(input: Omit<ToastMessage, 'id'>) {
  return (
    <div className="flex flex-col text-left">
      <span className="text-xs font-bold text-[#111c2d]">{input.title}</span>
      {input.message ? <span className="mt-0.5 text-[11px] text-[#424751]">{input.message}</span> : null}
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
          className: '!rounded !border !border-[#c2c6d3] !bg-white !text-[#111c2d] !shadow-lg !py-2.5 !px-3.5',
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
