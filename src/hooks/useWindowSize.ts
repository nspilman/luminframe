'use client'

import { Dimensions } from '@/domain/value-objects/Dimensions';

/**
 * Hook that returns the current window dimensions.
 * Returns default dimensions in SSR environment.
 */
export const useWindowSize = (): Dimensions => {
  if (typeof window !== 'undefined') {
    return new Dimensions(window.innerWidth, window.innerHeight);
  }
  return new Dimensions(1920, 1080);
} 