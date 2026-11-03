import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const EDGE_TOLERANCE = 2;
const DRAG_THRESHOLD = 5;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const arrowBase =
  "absolute top-1/2 z-20 hidden md:flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 -translate-y-1/2 items-center justify-center rounded-full " +
  "border border-slate-200/90 bg-white/95 text-slate-800 shadow-[0_4px_16px_rgba(15,23,42,0.16)] ring-1 ring-slate-900/5 backdrop-blur-sm " +
  "transition-all duration-200 hover:scale-105 hover:bg-white hover:text-emerald-700 active:scale-95 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 " +
  "dark:border-slate-600 dark:bg-slate-800/95 dark:text-slate-100 dark:hover:bg-slate-700 dark:hover:text-emerald-300 " +
  "dark:focus-visible:ring-offset-slate-900 cursor-pointer";

/**
 * Reusable horizontal card track.
 * - Native overflow scrolling on touch/trackpad (swipe + momentum, snap, no wrapping).
 * - Mouse click-and-drag scrolling on desktop without triggering accidental card clicks.
 * - Circular prev/next arrows overlaid on the edges (md+ and fine-pointer devices), driven by real geometry.
 * - Arrows disable/hide at the boundaries or when the content does not overflow.
 */
export default function HorizontalCarousel({
  children,
  ariaLabel = "items",
  className = "",
  trackClassName = "",
  trackRef,
  inset = false,
  arrowOffset = "default",
  leftArrowClassName = "",
  rightArrowClassName = "",
}) {
  const innerRef = useRef(null);
  const frameRef = useRef(0);
  const settleTimerRef = useRef(0);
  const suppressClickRef = useRef(false);
  const dragStateRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startScrollLeft: 0,
  });
  const trackId = useId();
  const [state, setState] = useState({ prev: false, next: false });
  const [isDragging, setIsDragging] = useState(false);

  // Expose the track element to parents that need it (entrance animations, scroll reset).
  useImperativeHandle(trackRef, () => innerRef.current, []);

  const update = useCallback(() => {
    const el = innerRef.current;
    if (!el) return;
    // snap-start aligns the first card to the padding edge, so that offset is the real "start".
    const padLeft = parseFloat(getComputedStyle(el).paddingLeft) || 0;
    const max = el.scrollWidth - el.clientWidth;
    const prev = el.scrollLeft > padLeft + EDGE_TOLERANCE;
    const next =
      max > padLeft + EDGE_TOLERANCE && el.scrollLeft < max - EDGE_TOLERANCE;
    setState((s) => (s.prev === prev && s.next === next ? s : { prev, next }));
  }, []);

  const scheduleUpdate = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(update);
  }, [update]);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return undefined;

    el.addEventListener("scroll", scheduleUpdate, { passive: true });

    const resizeObserver = new ResizeObserver(scheduleUpdate);
    const observeChildren = () => {
      resizeObserver.disconnect();
      resizeObserver.observe(el);
      Array.from(el.children).forEach((child) => resizeObserver.observe(child));
    };
    observeChildren();

    // Track dynamic card counts (filters, async data).
    const mutationObserver = new MutationObserver(() => {
      observeChildren();
      scheduleUpdate();
    });
    mutationObserver.observe(el, { childList: true });

    return () => {
      cancelAnimationFrame(frameRef.current);
      clearTimeout(settleTimerRef.current);
      el.removeEventListener("scroll", scheduleUpdate);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [scheduleUpdate]);

  // Mouse click-and-drag scrolling (touch devices continue using native swipe).
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return undefined;

    const getCardOffsets = () => {
      const items = Array.from(el.children);
      const trackLeft = el.getBoundingClientRect().left;
      return items.map(
        (child) =>
          child.getBoundingClientRect().left - trackLeft + el.scrollLeft,
      );
    };

    const handlePointerMove = (event) => {
      const drag = dragStateRef.current;
      if (!drag.active) return;

      const dx = event.clientX - drag.startX;
      if (!drag.moved) {
        if (Math.abs(dx) <= DRAG_THRESHOLD) return;
        drag.moved = true;
        setIsDragging(true);
        clearTimeout(settleTimerRef.current);
        el.style.scrollSnapType = "none";
        el.style.scrollBehavior = "auto";
      }

      event.preventDefault();
      const max = Math.max(0, el.scrollWidth - el.clientWidth);
      const nextScroll = Math.max(
        0,
        Math.min(max, drag.startScrollLeft - dx),
      );
      el.scrollLeft = nextScroll;
      scheduleUpdate();
    };

    const finishDrag = () => {
      const drag = dragStateRef.current;
      if (!drag.active) return;
      drag.active = false;

      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);

      if (!drag.moved) return;

      suppressClickRef.current = true;
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 80);
      setIsDragging(false);

      // Snap smoothly toward the card in the drag direction so a drag never yanks back to start.
      const totalDelta = el.scrollLeft - drag.startScrollLeft;
      const max = Math.max(0, el.scrollWidth - el.clientWidth);
      const lefts = getCardOffsets();

      if (lefts.length > 0 && Math.abs(totalDelta) > EDGE_TOLERANCE) {
        const direction = totalDelta > 0 ? 1 : -1;
        const candidates = lefts.filter((l) =>
          direction > 0
            ? l >= drag.startScrollLeft + EDGE_TOLERANCE
            : l <= drag.startScrollLeft - EDGE_TOLERANCE,
        );
        let target = el.scrollLeft;
        if (candidates.length > 0) {
          target = candidates.reduce((best, l) =>
            Math.abs(l - el.scrollLeft) < Math.abs(best - el.scrollLeft)
              ? l
              : best,
          );
        }
        target = Math.max(0, Math.min(max, target));
        el.scrollTo({
          left: target,
          behavior: prefersReducedMotion() ? "auto" : "smooth",
        });
      }

      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = window.setTimeout(() => {
        if (innerRef.current) {
          innerRef.current.style.scrollSnapType = "";
          innerRef.current.style.scrollBehavior = "";
          scheduleUpdate();
        }
      }, 380);
    };

    const handlePointerDown = (event) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      if (
        event.target instanceof Element &&
        event.target.closest("input, select, textarea, [data-no-drag]")
      ) {
        return;
      }
      const max = el.scrollWidth - el.clientWidth;
      if (max <= EDGE_TOLERANCE) return;

      dragStateRef.current = {
        active: true,
        moved: false,
        startX: event.clientX,
        startScrollLeft: el.scrollLeft,
      };

      window.addEventListener("pointermove", handlePointerMove, {
        passive: false,
      });
      window.addEventListener("pointerup", finishDrag);
      window.addEventListener("pointercancel", finishDrag);
    };

    el.addEventListener("pointerdown", handlePointerDown);

    return () => {
      el.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);
    };
  }, [scheduleUpdate]);

  const scrollByPage = useCallback((direction) => {
    const el = innerRef.current;
    if (!el) return;
    const items = Array.from(el.children);
    const trackLeft = el.getBoundingClientRect().left;
    const lefts = items.map(
      (child) => child.getBoundingClientRect().left - trackLeft + el.scrollLeft,
    );
    const gap =
      items.length > 1
        ? Math.max(0, lefts[1] - lefts[0] - items[0].offsetWidth)
        : 0;
    const max = el.scrollWidth - el.clientWidth;
    const rawTarget = el.scrollLeft + direction * (el.clientWidth - gap);

    let target = rawTarget;
    if (lefts.length) {
      // Align to the card edge closest to the computed page distance, guaranteeing progress.
      const candidates = lefts.filter((l) =>
        direction > 0
          ? l > el.scrollLeft + EDGE_TOLERANCE
          : l < el.scrollLeft - EDGE_TOLERANCE,
      );
      if (candidates.length) {
        target = candidates.reduce((best, l) =>
          Math.abs(l - rawTarget) < Math.abs(best - rawTarget) ? l : best,
        );
      }
    }
    target = Math.max(0, Math.min(max, target));
    el.scrollTo({
      left: target,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, []);

  const handleKeyDown = (event) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollByPage(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollByPage(-1);
    }
  };

  const handleArrow = (direction) => (event) => {
    event.preventDefault();
    event.stopPropagation();
    scrollByPage(direction);
  };

  const handleClickCapture = (event) => {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragStart = (event) => {
    event.preventDefault();
  };

  const hiddenState = "pointer-events-none opacity-0";
  const isPaddingMode = arrowOffset === "padding";
  const containerPadding = isPaddingMode ? "px-6 sm:px-9 md:px-11 lg:px-12" : "";

  const defaultLeft = isPaddingMode
    ? "left-0.5 sm:left-1 md:left-1.5 lg:left-2"
    : inset
      ? "left-2"
      : arrowOffset === "gap"
        ? "-left-2 sm:-left-3 md:-left-4 lg:-left-6 xl:-left-7"
        : "left-1 sm:left-0 sm:-translate-x-1/2";

  const defaultRight = isPaddingMode
    ? "right-0.5 sm:right-1 md:right-1.5 lg:right-2"
    : inset
      ? "right-2"
      : arrowOffset === "gap"
        ? "-right-2 sm:-right-3 md:-right-4 lg:-right-6 xl:-right-7"
        : "right-1 sm:right-0 sm:translate-x-1/2";

  const leftPos = leftArrowClassName || defaultLeft;
  const rightPos = rightArrowClassName || defaultRight;
  const canScrollAny = state.prev || state.next;

  return (
    <div className={`relative min-w-0 ${containerPadding} ${className}`}>
      <button
        type="button"
        aria-label={`Previous ${ariaLabel}`}
        aria-controls={trackId}
        disabled={!state.prev}
        tabIndex={state.prev ? 0 : -1}
        onClick={handleArrow(-1)}
        className={`${arrowBase} ${leftPos} ${state.prev ? "" : hiddenState}`}
      >
        <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
      </button>

      <div
        id={trackId}
        ref={innerRef}
        role="region"
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onClickCapture={handleClickCapture}
        onDragStart={handleDragStart}
        className={`flex snap-x snap-proximity overflow-x-auto overscroll-x-contain scrollbar-hide focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 [-webkit-overflow-scrolling:touch] ${
          canScrollAny
            ? isDragging
              ? "cursor-grabbing select-none"
              : "cursor-grab"
            : ""
        } ${trackClassName}`}
      >
        {children}
      </div>

      <button
        type="button"
        aria-label={`Next ${ariaLabel}`}
        aria-controls={trackId}
        disabled={!state.next}
        tabIndex={state.next ? 0 : -1}
        onClick={handleArrow(1)}
        className={`${arrowBase} ${rightPos} ${state.next ? "" : hiddenState}`}
      >
        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
      </button>
    </div>
  );
}
