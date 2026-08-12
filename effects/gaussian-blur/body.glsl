void main() {
  // The corpus's 7x7 gaussian gather. Taps sit radius/3 apart, so the dial
  // reads as the blur's reach in source pixels — the same ruler Sharpen and
  // Tilt Shift measure with, and the preview predicts the export.
  // ponytail: one-pass 7x7 gather — past this range's cap the tap seams show.
  // A wider blur wants a separable two-pass kernel, which one effect (one
  // pass) can't express; that is what the range is capped for.
  vec3 blur = vec3(0.0);
  float total = 0.0;
  for (float i = -3.0; i <= 3.0; i += 1.0) {
    for (float j = -3.0; j <= 3.0; j += 1.0) {
      vec2 off = vec2(i, j) * (radius / 3.0) / resolution;
      float w = exp(-(i * i + j * j) / 6.0);
      blur += texture2D(imageTexture, vUv + off).rgb * w;
      total += w;
    }
  }

  gl_FragColor = vec4(blur / total, 1.0);
}
