import anime from "animejs";

/**
 * Checks if user prefers reduced motion for accessibility
 */
export const prefersReducedMotion = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

/**
 * Formats a number with Indian currency comma grouping (e.g. 12,345)
 */
const formatNumber = (num) => {
  return Math.round(num).toLocaleString("en-IN");
};

/**
 * Staggered Entrance Animation for card grids & lists (e.g. Flight Cards, Hotel Listings)
 */
export const staggerEntrance = (targets, options = {}) => {
  if (!targets || prefersReducedMotion()) return null;

  return anime({
    targets,
    opacity: [0, 1],
    translateY: [28, 0],
    scale: [0.98, 1],
    delay: anime.stagger(options.stagger || 60, { start: options.startDelay || 50 }),
    duration: options.duration || 600,
    easing: "cubicBezier(0.16, 1, 0.3, 1)",
    complete: (anim) => {
      anim.animatables.forEach((a) => {
        if (a.target?.style) {
          a.target.style.transform = "";
        }
      });
      if (options.complete) options.complete(anim);
    },
    ...options,
  });
};

/**
 * Smooth Numeric Counter Animation for Live Fares & Totals
 * Tweens an object's value from startValue to endValue and updates element's textContent.
 */
export const animateCounter = (element, endValue, options = {}) => {
  if (!element) return null;
  const targetVal = Number(endValue) || 0;

  if (prefersReducedMotion()) {
    element.textContent = formatNumber(targetVal);
    return null;
  }

  // Parse existing number from element text or startValue
  const currentText = element.textContent.replace(/[^\d.]/g, "");
  const startVal = options.startValue !== undefined ? Number(options.startValue) : Number(currentText) || 0;

  const counterObj = { value: startVal };

  return anime({
    targets: counterObj,
    value: targetVal,
    duration: options.duration || 650,
    easing: "easeOutExpo",
    round: 1,
    update: () => {
      const prefix = options.prefix || "";
      const suffix = options.suffix || "";
      element.textContent = `${prefix}${formatNumber(counterObj.value)}${suffix}`;
    },
    ...options,
  });
};

/**
 * Gliding Flight Route Path Visualizer
 * Animates the SVG line drawing and flies the airplane icon smoothly along the flight connector.
 */
export const animateFlightRoute = (lineTarget, planeTarget, options = {}) => {
  if (prefersReducedMotion()) return null;

  const timeline = anime.timeline({
    loop: options.loop ?? true,
    autoplay: true,
  });

  if (lineTarget) {
    timeline.add(
      {
        targets: lineTarget,
        strokeDashoffset: [anime.setDashoffset, 0],
        duration: options.duration || 1800,
        easing: "easeInOutQuad",
      },
      0
    );
  }

  if (planeTarget) {
    timeline.add(
      {
        targets: planeTarget,
        translateX: ["-30%", "130%"],
        scale: [0.85, 1.15, 0.85],
        duration: options.duration || 1800,
        easing: "easeInOutQuad",
      },
      0
    );
  }

  return timeline;
};

/**
 * Spring Entrance for Popovers, Modals & Dropdowns (Travellers popover, View Prices modal)
 */
export const springEntrance = (target, options = {}) => {
  if (!target || prefersReducedMotion()) return null;

  anime.remove(target);
  return anime({
    targets: target,
    opacity: [0, 1],
    scale: [0.88, 1],
    translateY: [-8, 0],
    duration: options.duration || 320,
    easing: "cubicBezier(0.34, 1.56, 0.64, 1)", // organic spring bounce
    complete: (anim) => {
      anim.animatables.forEach((a) => {
        if (a.target?.style) {
          a.target.style.transform = "";
        }
      });
      if (options.complete) options.complete(anim);
    },
    ...options,
  });
};

/**
 * Spring Exit for Popovers & Modals
 */
export const springExit = (target, onComplete) => {
  if (!target) {
    if (onComplete) onComplete();
    return null;
  }

  if (prefersReducedMotion()) {
    if (onComplete) onComplete();
    return null;
  }

  anime.remove(target);
  return anime({
    targets: target,
    opacity: [1, 0],
    scale: [1, 0.92],
    duration: 200,
    easing: "easeInQuad",
    complete: onComplete,
  });
};

/**
 * 180° Elastic Spin for Airport Swap Button
 */
export const rotateSwap = (target, currentDeg = 0) => {
  if (!target || prefersReducedMotion()) return null;

  anime.remove(target);
  const nextDeg = currentDeg + 180;
  return anime({
    targets: target,
    rotate: nextDeg,
    scale: [0.85, 1.12, 1],
    duration: 500,
    easing: "cubicBezier(0.34, 1.56, 0.64, 1)",
  });
};

/**
 * Organic Pulsing Animation for Live Indicators (On-Time Badges, Verified Fares)
 */
export const pulseIndicator = (target) => {
  if (!target || prefersReducedMotion()) return null;

  return anime({
    targets: target,
    scale: [1, 1.25, 1],
    opacity: [0.75, 1, 0.75],
    duration: 1600,
    loop: true,
    easing: "easeInOutSine",
  });
};

/**
 * Button Click Micro-Interaction (Gentle elastic squash & release)
 */
export const clickSquash = (target) => {
  if (!target || prefersReducedMotion()) return null;

  return anime({
    targets: target,
    scale: [
      { value: 0.94, duration: 80, easing: "easeOutQuad" },
      { value: 1.03, duration: 120, easing: "easeOutBack" },
      { value: 1, duration: 100, easing: "easeInOutQuad" },
    ],
  });
};

export default {
  staggerEntrance,
  animateCounter,
  animateFlightRoute,
  springEntrance,
  springExit,
  rotateSwap,
  pulseIndicator,
  clickSquash,
};
