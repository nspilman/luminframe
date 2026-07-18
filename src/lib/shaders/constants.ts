export const DEFAULT_RESOLUTION = [1920, 1080] as [number, number];
export const PI = Math.PI;
export const TWO_PI = Math.PI * 2;

/**
 * The input key composite effects (Blend, Displacement) declare for their
 * second image. Named once here so the UI that offers to fill the slot and the
 * editor that fills it can never drift apart.
 */
export const SECOND_IMAGE_INPUT = 'imageTextureTwo';