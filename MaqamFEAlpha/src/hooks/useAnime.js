import { useEffect, useRef } from "react";
import anime from "animejs";

/**
 * Custom React Hook to safely run anime.js animations with auto-cleanup on unmount.
 *
 * @param {Function} animFn - Callback that receives the target element and returns an anime instance
 * @param {Array} deps - Dependency array that triggers the animation re-run
 * @returns {Object} React ref to attach to the target element
 */
export const useAnime = (animFn, deps = []) => {
  const targetRef = useRef(null);
  const animInstanceRef = useRef(null);

  useEffect(() => {
    if (targetRef.current && typeof animFn === "function") {
      // Clean up previous animation if still active
      if (animInstanceRef.current) {
        anime.remove(targetRef.current);
      }

      animInstanceRef.current = animFn(targetRef.current);
    }

    return () => {
      if (targetRef.current) {
        anime.remove(targetRef.current);
      }
      if (animInstanceRef.current?.pause) {
        animInstanceRef.current.pause();
      }
    };
  }, deps);

  return targetRef;
};

export default useAnime;
