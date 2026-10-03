'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { ZALO_URL } from '@/components/landing/zalo-button';
import { SUPPORT_GREETING, SUPPORT_QA, type SupportQa } from '@/components/landing/support-chat-content';

interface ChatMessage {
  from: 'bot' | 'user';
  text: string;
  /** bot answers carry a Zalo handoff link */
  zalo?: boolean;
}

/**
 * Floating support chat — landing page only, sits above the Zalo button.
 * Closed questions with canned answers (no LLM, no API); anything it
 * can't answer funnels to Zalo via the same ZALO_URL as the floating button.
 */
export function SupportChat() {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(false);
  const [asked, setAsked] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([{ from: 'bot', text: SUPPORT_GREETING }]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const remaining = SUPPORT_QA.filter((qa) => !asked.includes(qa.question));

  function ask(qa: SupportQa) {
    setMessages((prev) => [
      ...prev,
      { from: 'user', text: qa.question },
      { from: 'bot', text: qa.answer, zalo: true },
    ]);
    setAsked((prev) => [...prev, qa.question]);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    const el = scrollRef.current;
    if (open && el) el.scrollTop = el.scrollHeight;
  }, [open, messages]);

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Chat hỗ trợ IceFlow"
          className="fixed bottom-[132px] right-4 z-40 flex w-[min(20rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-outline-variant bg-card shadow-2xl sm:bottom-[156px] sm:right-6"
          style={{ maxHeight: 'min(26rem, calc(100dvh - 11rem))' }}
        >
          <div className="flex items-center justify-between gap-2 bg-primary-container px-4 py-3 text-white">
            <div>
              <p className="text-sm font-bold">IceFlow hỗ trợ</p>
              <p className="text-[10px] text-white/80">Trả lời tức thì · Người thật qua Zalo</p>
            </div>
            <button
              ref={closeRef}
              onClick={() => setOpen(false)}
              aria-label="Đóng chat hỗ trợ"
              className="rounded p-1 transition-colors hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-container-low/50 p-3">
            {messages.map((msg, i) => (
              <div key={i} className={msg.from === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={
                    msg.from === 'user'
                      ? 'max-w-[85%] rounded-lg rounded-br-sm bg-primary-container px-3 py-2 text-xs leading-relaxed text-white'
                      : 'max-w-[85%] rounded-lg rounded-bl-sm border border-outline-soft bg-card px-3 py-2 text-xs leading-relaxed text-on-surface shadow-xs'
                  }
                >
                  <p>{msg.text}</p>
                  {msg.zalo && (
                    <a
                      href={ZALO_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-block text-[11px] font-bold text-primary-accent underline underline-offset-2"
                    >
                      Nhắn Zalo được tư vấn thêm →
                    </a>
                  )}
                </div>
              </div>
            ))}
            {remaining.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {remaining.map((qa) => (
                  <button
                    key={qa.question}
                    onClick={() => ask(qa)}
                    className="rounded-full border border-outline-variant bg-card px-2.5 py-1.5 text-left text-[11px] font-bold text-primary-accent transition-colors hover:bg-container-high"
                  >
                    {qa.question}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-outline-soft p-3">
            <a
              href={ZALO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 rounded bg-[#0068ff] py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#0058d6]"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Vẫn thắc mắc? Nhắn trực tiếp qua Zalo
            </a>
          </div>
        </div>
      )}

      <button
        onClick={() => {
          setOpen((v) => !v);
          setSeen(true);
        }}
        aria-expanded={open}
        aria-controls="support-chat-panel"
        aria-label={open ? 'Đóng chat hỗ trợ IceFlow' : 'Mở chat hỗ trợ IceFlow'}
        title="Chat hỗ trợ IceFlow"
        className="group fixed bottom-[76px] right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary-container text-white shadow-lg shadow-primary-container/40 transition-transform duration-200 hover:scale-105 motion-reduce:transition-none sm:bottom-[92px] sm:right-6 sm:h-14 sm:w-14"
      >
        {open ? (
          <X className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
        ) : (
          <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
        )}
        {!seen && !open && (
          <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-error ring-2 ring-surface" />
        )}
      </button>
    </>
  );
}
