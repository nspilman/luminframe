vec3 adjustSaturation(vec3 color, float saturation) {
  float grey = dot(color, vec3(0.299, 0.587, 0.114));
  return mix(vec3(grey), color, saturation);
}

void main() {
  // The dial is the blur's reach in taps; the bell's width follows it, floored
  // so the math stays finite at zero (0/0 is NaN, and NaN was the old minimum).
  float sigma = max(blurAmount, 0.5);

  vec3 color = vec3(0.0);
  float total = 0.0;
  for (float i = -blurAmount; i <= blurAmount; i += 1.0) {
    for (float j = -blurAmount; j <= blurAmount; j += 1.0) {
      vec2 off = vec2(i, j) / resolution;
      float w = exp(-(i * i + j * j) / (2.0 * sigma * sigma));
      color += texture2D(imageTexture, vUv + off).rgb * w;
      total += w;
    }
  }
  color /= total;

  // Soft first, then lifted and saturated — the dream is a brightened blur.
  color = adjustSaturation(color, saturation);
  color *= brightness;

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
