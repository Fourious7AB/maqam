import React from 'react';

/**
 * LumaSpin - Authentic Luma-inspired loader component
 * Directly created from https://21st.dev/@theritikk/components/luma-spin
 *
 * Features:
 * - Two counter-rotating, morphing capsule spans animating along a square track
 *   via @keyframes loaderAnim with 180-degree out-of-phase animation-delay (-1.25s)
 * - Inset border shadows matching the signature 21st.dev Luma Spin design
 * - Perfectly scalable across responsive sizes (xs, sm, md, default, lg, xl, 2xl)
 * - Ambient backdrop bloom and customizable themes (brand, emerald, monochrome, gold, indigo)
 * - Accessible ARIA attributes, fullScreen backdrop mode, and shimmering progress bar
 */

const SIZES = {
  xs: { box: 24, stroke: 2 },
  sm: { box: 36, stroke: 2.5 },
  md: { box: 48, stroke: 3 },
  default: { box: 58, stroke: 3 },
  lg: { box: 66, stroke: 3.5 },
  xl: { box: 84, stroke: 4 },
  '2xl': { box: 104, stroke: 4.5 },
};

const VARIANTS = {
  brand: {
    shadowColorLight: '#00987A',
    shadowColorDark: '#10b981',
    textColor: 'text-slate-800 dark:text-slate-100',
    subtextColor: 'text-slate-500 dark:text-slate-400',
    progressBar: 'from-[#00987A] to-[#10b981]',
  },
  emerald: {
    shadowColorLight: '#00987A',
    shadowColorDark: '#10b981',
    textColor: 'text-slate-800 dark:text-slate-100',
    subtextColor: 'text-slate-500 dark:text-slate-400',
    progressBar: 'from-[#00987A] to-[#10b981]',
  },
  monochrome: {
    shadowColorLight: '#1f2937',
    shadowColorDark: '#f3f4f6',
    textColor: 'text-slate-800 dark:text-slate-100',
    subtextColor: 'text-slate-500 dark:text-slate-400',
    progressBar: 'from-gray-700 to-gray-400',
  },
  gold: {
    shadowColorLight: '#d97706',
    shadowColorDark: '#fbbf24',
    textColor: 'text-slate-800 dark:text-slate-100',
    subtextColor: 'text-slate-500 dark:text-slate-400',
    progressBar: 'from-amber-500 to-yellow-400',
  },
  indigo: {
    shadowColorLight: '#4f46e5',
    shadowColorDark: '#818cf8',
    textColor: 'text-slate-800 dark:text-slate-100',
    subtextColor: 'text-slate-500 dark:text-slate-400',
    progressBar: 'from-indigo-600 to-indigo-400',
  },
};

export default function LumaSpin({
  size = 'default',
  variant = 'brand',
  text,
  subtext,
  fullScreen = false,
  showProgress = false,
  className = '',
}) {
  const sizeConfig = SIZES[size] || SIZES.default;
  const theme = VARIANTS[variant] || VARIANTS.brand;

  // Clean, crisp capsule geometric animation
  const spinnerMarkup = (
    <div
      className={`relative aspect-square shrink-0 select-none luma-track-container ${className}`}
      style={{
        width: sizeConfig.box,
        height: sizeConfig.box,
        '--luma-size': `${sizeConfig.box}px`,
        '--luma-stroke': `${sizeConfig.stroke}px`,
        '--luma-stroke-color': theme.shadowColorLight,
        '--luma-stroke-color-dark': theme.shadowColorDark,
      }}
      role="status"
      aria-label={text || 'Loading'}
    >
      <style>{`
        @keyframes lumaSpinAnim {
          0% {
            inset: 0 53.85% 53.85% 0;
          }
          12.5% {
            inset: 0 53.85% 0 0;
          }
          25% {
            inset: 53.85% 53.85% 0 0;
          }
          37.5% {
            inset: 53.85% 0 0 0;
          }
          50% {
            inset: 53.85% 0 0 53.85%;
          }
          62.5% {
            inset: 0 0 0 53.85%;
          }
          75% {
            inset: 0 0 53.85% 53.85%;
          }
          87.5% {
            inset: 0 0 53.85% 0;
          }
          100% {
            inset: 0 53.85% 53.85% 0;
          }
        }
        @keyframes lumaShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
        .luma-capsule {
          position: absolute;
          border-radius: 9999px;
          animation: lumaSpinAnim 2.4s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
          box-shadow: inset 0 0 0 var(--luma-stroke, 3px) var(--luma-stroke-color, #00987A);
        }
        .dark .luma-capsule {
          box-shadow: inset 0 0 0 var(--luma-stroke, 3px) var(--luma-stroke-color-dark, #10b981) !important;
        }
        .luma-capsule-delay {
          animation-delay: -1.2s;
        }
        .luma-shimmer-bar {
          animation: lumaShimmer 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>

      {/* Capsule 1: Moving clockwise along square perimeter */}
      <span className="luma-capsule" />

      {/* Capsule 2: Counterpart offset by half the cycle */}
      <span className="luma-capsule luma-capsule-delay" />
    </div>
  );

  // If used purely as an inline spinner without text wrapper
  if (!fullScreen && !text && !subtext) {
    return spinnerMarkup;
  }

  // Content block with text & progress bar
  const content = (
    <div className="flex flex-col items-center justify-center text-center px-4 max-w-sm sm:max-w-md mx-auto">
      {spinnerMarkup}

      {text && (
        <div className="mt-5 space-y-1">
          <p
            className={`text-base sm:text-lg font-semibold tracking-tight ${theme.textColor} transition-colors`}
          >
            {text}
          </p>

          {subtext && (
            <p className={`text-xs sm:text-sm font-normal ${theme.subtextColor} max-w-xs sm:max-w-sm`}>
              {subtext}
            </p>
          )}
        </div>
      )}

      {showProgress && (
        <div className="w-44 sm:w-56 h-1.5 bg-slate-200/80 dark:bg-slate-800 rounded-full mt-4 overflow-hidden relative shadow-inner">
          <div
            className={`luma-shimmer-bar absolute inset-y-0 w-1/2 rounded-full bg-gradient-to-r ${theme.progressBar}`}
          />
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 dark:bg-[#07131b]/95 backdrop-blur-md transition-all duration-200 min-h-[100dvh]"
        aria-live="polite"
      >
        {content}
      </div>
    );
  }

  // Inline container loader with min-height
  return (
    <div
      className="w-full min-h-[160px] py-6 flex items-center justify-center"
      aria-live="polite"
    >
      {content}
    </div>
  );
}
