
import React from 'react';

export default function TelegramSupport() {
  const TELEGRAM_URL = 'https://t.me/buivduc07z';

  return (
    <a
      href={TELEGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Liên hệ hỗ trợ qua Telegram"
      title="Hỗ trợ Telegram"
      className="fixed bottom-6 right-5 z-[9999] group"
    >
      <div className="flex items-center gap-2">
        <span
          className="bg-slate-900 text-white text-xs px-3 py-2
                     rounded-lg shadow-lg border border-slate-700
                     opacity-0 group-hover:opacity-100
                     transition-opacity duration-300"
        >
          Hỗ trợ Telegram
        </span>

        <div
          className="relative w-14 h-14 rounded-full
                     bg-[#229ED9] flex items-center justify-center
                     shadow-lg shadow-sky-500/30
                     hover:scale-110 transition-transform duration-300"
        >
          <span className="absolute inset-0 rounded-full bg-sky-400/30 animate-ping" />

          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="white"
            className="relative w-8 h-8"
            aria-hidden="true"
          >
            <path d="M21.94 4.67a1.5 1.5 0 0 0-1.66-.24L2.43 11.31c-1.26.49-1.25 1.22-.23 1.53l4.58 1.43 1.77 5.56c.22.63.11.88.77.88.51 0 .73-.23 1.01-.5l2.45-2.39 5.09 3.76c.94.52 1.61.25 1.84-.87l3.13-14.75c.34-1.36-.52-1.98-.9-1.29ZM8.3 13.94l10.74-6.77c.54-.33 1.04-.15.63.22l-9.19 8.3-.36 3.84-1.82-5.59Z" />
          </svg>
        </div>
      </div>
    </a>
  );
}
