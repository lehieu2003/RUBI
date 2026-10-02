'use client';

import { useState, useEffect } from 'react';
import { Keyboard, X } from 'lucide-react';

export function KeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input or textarea
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

      // F1 or '?' (Shift + /)
      if ((e.key === 'F1' || (e.key === '?' && !isInput)) && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }

      // Escape closes the help modal
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const shortcuts = [
    { key: 'F1 hoặc ?', desc: 'Xem Bảng Hướng Dẫn Phím Tắt Này' },
    { key: 'Tab', desc: 'Chuyển nhanh giữa các ô nhập liệu' },
    { key: 'Enter', desc: 'Xác nhận tạo đơn / Lưu mẻ đá' },
    { key: 'Esc', desc: 'Đóng Modal / Hủy thao tác' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50 backdrop-blur-xs"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card border border-outline-variant rounded shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-outline-soft pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-container-high text-primary-accent flex items-center justify-center">
              <Keyboard className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-on-surface">Phím Tắt Vận Hành</h3>
              <p className="text-[11px] text-faint">Thao tác nhanh không cần dùng chuột</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded text-faint hover:text-on-surface hover:bg-container-low"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2.5">
          {shortcuts.map((sc, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded bg-surface border border-outline-soft text-xs"
            >
              <span className="text-on-surface-variant font-medium">{sc.desc}</span>
              <kbd className="px-2.5 py-1 rounded bg-card border border-outline-variant font-mono font-bold text-primary-accent shadow-2xs">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-3 border-t border-outline-soft text-center">
          <p className="text-[11px] text-faint">
            Nhấn <kbd className="px-1.5 py-0.5 rounded bg-container-high text-primary-accent font-bold">Esc</kbd> hoặc click ra ngoài để đóng
          </p>
        </div>
      </div>
    </>
  );
}
