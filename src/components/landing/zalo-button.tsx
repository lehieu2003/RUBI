/**
 * Floating Zalo chat button — landing page only.
 *
 * Replace ZALO_URL with the xưởng's real Zalo OA link (https://zalo.me/xxxx
 * or an OA page URL) before going live.
 */
export const ZALO_URL = 'https://zalo.me/0901234567';

export function ZaloFloatingButton() {
  return (
    <a
      href={ZALO_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat Zalo với IceFlow"
      title="Chat Zalo với IceFlow"
      className="group fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6"
    >
      {/* attention ring (skipped for reduced-motion users) */}
      <span
        aria-hidden="true"
        className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0068ff] opacity-25 motion-reduce:hidden"
      />
      <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[#0068ff] shadow-lg shadow-[#0068ff]/40 transition-transform duration-200 group-hover:scale-105 sm:h-14 sm:w-14">
        <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true">
          <path
            d="M12 3C7.03 3 3 6.58 3 11c0 2.4 1.2 4.57 3.13 6.05L5.5 21l3.66-1.85c.9.23 1.85.35 2.84.35 4.97 0 9-3.58 9-8s-4.03-8-9-8z"
            fill="#ffffff"
          />
          <text
            x="12"
            y="13.6"
            textAnchor="middle"
            fontSize="5.4"
            fontWeight="800"
            fill="#0068ff"
            fontFamily="Inter, system-ui, sans-serif"
          >
            Zalo
          </text>
        </svg>
      </span>
    </a>
  );
}
