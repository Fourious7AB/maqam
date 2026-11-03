import React from 'react';
import LumaSpin from '../../../components/ui/LumaSpin';

/**
 * Admin LoadingSpinner - Powered by LumaSpin
 * Retains full backward compatibility with existing admin pages while
 * delivering the modern luminous multi-ring loading experience.
 */
export default function LoadingSpinner({
  text = 'Loading...',
  fullScreen = false,
  size = 'md',
  subtext,
  variant = 'brand',
}) {
  return (
    <LumaSpin
      size={fullScreen ? 'lg' : size}
      variant={variant}
      text={text}
      subtext={subtext}
      fullScreen={fullScreen}
      showProgress={fullScreen}
    />
  );
}
