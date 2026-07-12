/**
 * "Contain" fit: the largest size an image can be drawn at inside a container
 * while keeping its aspect ratio and fitting *entirely* within both dimensions —
 * the letterbox/pillarbox rule an editor canvas must follow so the whole image
 * is always visible and never distorted or clipped.
 *
 * The scale is bound by whichever dimension runs out first
 * (`min(containerW/imageW, containerH/imageH)`); the leftover space on the other
 * axis becomes neutral gutter. This scales a small image *up* to fill the
 * viewport (fit-to-window), which is the expected default for a main canvas.
 *
 * Returns a zero size when any input is non-positive, so a container that hasn't
 * been laid out yet (0×0) yields nothing to draw rather than a divide-by-zero.
 */
export function containFit(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number
): { width: number; height: number } {
  if (containerWidth <= 0 || containerHeight <= 0 || imageWidth <= 0 || imageHeight <= 0) {
    return { width: 0, height: 0 }
  }
  const scale = Math.min(containerWidth / imageWidth, containerHeight / imageHeight)
  return { width: imageWidth * scale, height: imageHeight * scale }
}
