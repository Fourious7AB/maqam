
import React, { useCallback, useState, useEffect } from "react";
import { motion } from "framer-motion";

/* =========================================================
   SINGLE LETTER
========================================================= */

const SwapLetter = ({
  character,
  index,
  animationKey,
  isAnimating,
  transitionDuration,
  staggerDuration,
}) => {
  /* -------------------------------------------------------
     Alternating direction

     0  -> top
     1  -> bottom
     2  -> top
     3  -> bottom
  ------------------------------------------------------- */

  const fromTop = index % 2 === 0;

  const startY = fromTop ? -110 : 110;

  /* -------------------------------------------------------
     Spaces
  ------------------------------------------------------- */

  if (character === " ") {
    return (
      <span
        aria-hidden="true"
        className="inline-block w-[0.28em]"
      >
        &nbsp;
      </span>
    );
  }

  return (
    <span
      className="
        relative
        inline-block
        h-[1em]
        overflow-hidden
        align-baseline
      "
      aria-hidden="true"
    >
      {/* ---------------------------------------------------
          Invisible width reservation

          Prevents layout shifting during animation.
      --------------------------------------------------- */}

      <span
        className="
          invisible
          block
          h-[1em]
          whitespace-pre
          leading-none
        "
      >
        {character}
      </span>

      {/* ---------------------------------------------------
          Animated character
      --------------------------------------------------- */}

      <motion.span
        key={`${character}-${index}-${animationKey}`}
        initial={{
          y: isAnimating ? `${startY}%` : "0%",
          opacity: isAnimating ? 0 : 1,
        }}
        animate={{
          y: "0%",
          opacity: 1,
        }}
        transition={{
          type: "spring",
          stiffness: 280,
          damping: 23,
          mass: 0.65,

          delay: isAnimating
            ? index * staggerDuration
            : 0,

          duration: transitionDuration,
        }}
        className="
          absolute
          inset-0
          flex
          items-center
          justify-center
          whitespace-pre
          leading-none
          will-change-transform
        "
      >
        {character}
      </motion.span>
    </span>
  );
};

/* =========================================================
   RANDOM LETTER SWAP
========================================================= */

const RandomLetterSwap = ({
  label = "",
  className = "",
  staggerDuration = 0.035,
  transitionDuration = 0.55,
  isHovered: externalHover,
  onClick,
}) => {
  const [internalHovered, setInternalHovered] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  const isControlled = externalHover !== undefined;
  const isAnimating = isControlled ? externalHover : internalHovered;

  useEffect(() => {
    if (externalHover) {
      setAnimationKey((prev) => prev + 1);
    }
  }, [externalHover]);

  /* =======================================================
     START ANIMATION
  ======================================================= */

  const startAnimation = useCallback(() => {
    setAnimationKey((previous) => previous + 1);
    setInternalHovered(true);
  }, []);

  /* =======================================================
     MOUSE ENTER
  ======================================================= */

  const handleMouseEnter = useCallback(() => {
    startAnimation();
  }, [startAnimation]);

  /* =======================================================
     MOUSE LEAVE

     We intentionally don't reverse the animation.
  ======================================================= */

  const handleMouseLeave = useCallback(() => {
    setInternalHovered(false);
  }, []);

  /* =======================================================
     FOCUS
  ======================================================= */

  const handleFocus = useCallback(() => {
    startAnimation();
  }, [startAnimation]);

  /* =======================================================
     BLUR
  ======================================================= */

  const handleBlur = useCallback(() => {
    setInternalHovered(false);
  }, []);

  /* =======================================================
     KEYBOARD
  ======================================================= */

  const handleKeyDown = (event) => {
    if (!onClick) return;

    if (
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <span
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={label}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`
        inline-flex
        items-center
        whitespace-nowrap
        select-none
        leading-none
        ${onClick ? "cursor-pointer" : ""}
        ${className}
      `}
    >
      {[...label].map((character, index) => (
        <SwapLetter
          key={`${label}-${index}`}
          character={character}
          index={index}
          animationKey={animationKey}
          isAnimating={isAnimating}
          transitionDuration={transitionDuration}
          staggerDuration={staggerDuration}
        />
      ))}
    </span>
  );
};

export default RandomLetterSwap;

