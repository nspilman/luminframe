'use client'

import { Dimensions } from '@/domain/value-objects/Dimensions';

/**
 * Hook that returns the current window dimensions.
 *
 * Clamped to at least 1×1: a window can genuinely measure zero — a page
 * loading in a hidden or background tab that hasn't composited yet — and
 * Dimensions rightly refuses zero. Without the clamp, the first render in
 * such a tab throws and, with no error boundary above, takes the whole app
 * down; the tab then stays blank even after it becomes visible.
 * Returns default dimensions in SSR environment.
 */
export const useWindowSize = (): Dimensions => {
  if (typeof window !== 'undefined') {
    return new Dimensions(Math.max(1, window.innerWidth), Math.max(1, window.innerHeight));
  }
  return new Dimensions(1920, 1080);
}
