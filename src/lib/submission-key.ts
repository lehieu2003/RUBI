import { useMemo, useRef } from 'react';
import { IDEMPOTENCY_HEADER } from '@/lib/contracts/common';

/** A random UUID, also where crypto.randomUUID is missing (plain-http pages). */
function randomKey(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * The Idempotency-Key of a form that adds to a balance. Sending the same body
 * again (a retry after the answer was lost) reuses the key, so the server
 * writes it once; a changed body is a new submission and gets a new key.
 * Call done() once the server confirmed the write.
 */
export function useSubmissionKey() {
  const current = useRef<{ body: string; key: string } | null>(null);
  return useMemo(
    () => ({
      headers(body: string): Record<string, string> {
        if (current.current?.body !== body) current.current = { body, key: randomKey() };
        return { [IDEMPOTENCY_HEADER]: current.current.key };
      },
      done() {
        current.current = null;
      },
    }),
    []
  );
}
