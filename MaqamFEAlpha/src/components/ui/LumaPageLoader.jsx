import React, { useEffect, useState } from 'react';
import LumaSpin from './LumaSpin';

const DEFAULT_MESSAGES = [
  "Preparing your travel experience...",
  "Fetching latest live availability...",
  "Just a moment...",
];

/**
 * LumaPageLoader
 * Full-page route transition and page load screen featuring the
 * clean geometric capsule loader in brand green.
 */
export default function LumaPageLoader({
  text = "Loading...",
  subtext,
  variant = "brand",
}) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (subtext) return; // If caller supplied specific subtext, use that
    const timer = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % DEFAULT_MESSAGES.length);
    }, 2200);
    return () => clearInterval(timer);
  }, [subtext]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 dark:bg-[#07131b]/95 backdrop-blur-md select-none min-h-[100dvh] px-4"
      role="status"
      aria-live="polite"
    >
      <div className="relative flex flex-col items-center w-full max-w-sm sm:max-w-md text-center">
        <LumaSpin
          size="lg"
          variant={variant}
          showProgress={true}
          text={text}
          subtext={subtext || DEFAULT_MESSAGES[msgIndex]}
        />
      </div>
    </div>
  );
}

